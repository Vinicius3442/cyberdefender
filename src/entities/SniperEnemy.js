import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class SniperEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.hp = 40;
        this.speed = 2.0; // Slow repositioning
        this.attackRange = 40;
        this.attackCooldown = 3.5;
        this.attackTimer = 0;
        
        // Parts
        // Parts - initialized in _createMesh
        // this.headMesh = null;
        // this.legs = [];
        // this.gunBarrel = null;
    }

    _createMesh() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green Laser Eye

        // Tripod Legs
        this.legs = [];
        const legAngles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
        legAngles.forEach(angle => {
            const legGroup = new THREE.Group();
            legGroup.rotation.y = angle;
            
            // Upper
            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), bodyMat);
            upper.position.set(0, 1.2, 0.3); // Out and up
            upper.rotation.x = -Math.PI / 6;
            legGroup.add(upper);
            
            // Lower
            const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 1.5), bodyMat);
            lower.position.set(0, 0.5, 0.6); // End of upper
            lower.rotation.x = Math.PI / 6;
            legGroup.add(lower);
            
            group.add(legGroup);
            this.legs.push(legGroup);
        });

        // Head/Body
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), bodyMat);
        head.position.y = 1.8;
        group.add(head);
        this.headMesh = head;

        // Long Railgun
        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.5), gunMat);
        gun.position.set(0.3, 1.8, 0.8);
        group.add(gun);
        this.gunBarrel = gun;
        
        // Large Scope/Eye
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2), glowMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(0, 1.8, 0.25);
        group.add(eye);
        this.eyeMesh = eye;
        
        return group;
    }

    update(dt, playerPosition) {
        super.update(dt, playerPosition); // Updates animations
        if (this.isDead && !this.playingDeathAnim) return;

        const dist = this.mesh.position.distanceTo(playerPosition);
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
        this.updateGroundPosition();
        
        if (this.isDead && this.playingDeathAnim) return;

        if (dist > this.attackRange) {
             // Reposition
             const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
             direction.y = 0;
             this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        } else {
            // Charging logic
            this.attackTimer -= dt;
            if (this.attackTimer < 1.0 && this.attackTimer > 0) {
                 // Charging visual
                 this.eyeMesh.scale.setScalar(1 + (1.0 - this.attackTimer) * 0.5);
                 this.playAnimation('charge');
            }
            
            if (this.attackTimer <= 0) {
                this.shoot(playerPosition);
                this.playAnimation('recoil');
                this.attackTimer = this.attackCooldown;
                this.eyeMesh.scale.setScalar(1);
            }
        }
    }

    animCharge(t) {
        // Shake
        this.gunBarrel.position.x = 0.3 + Math.random() * 0.02;
    }

    animDie(t) {
        // Collapse Legs
        this.legs.forEach(leg => {
             leg.rotation.z += 0.05; // Splay out
             leg.scale.y -= 0.01;
        });
        
        this.mesh.position.y -= 0.1 * t;
        this.headMesh.rotation.x += 0.05;
        
        // Fade eye
        if (this.eyeMesh.material.opacity > 0) {
            this.eyeMesh.visible = false;
        }
    }
    
    shoot(targetPos) {
        const spawnPos = this.gunBarrel.getWorldPosition(new THREE.Vector3());
        // Aim at Chest (Player Head - 0.4)
        const aimTarget = targetPos.clone().add(new THREE.Vector3(0, -0.4, 0));
        
        const direction = new THREE.Vector3()
            .subVectors(aimTarget, this.mesh.position) // Aim from Sniper BODY to Player
            // Actually, aim from GUN BARREL to Player
            .subVectors(aimTarget, spawnPos)
            .normalize();

        spawnPos.add(direction.clone().multiplyScalar(1.5));
        
        const projectile = new Projectile(spawnPos, direction, false);
        projectile.velocity.multiplyScalar(4.0); // Super fast railgun
        projectile.damage = 40;
        projectile.mesh.material.color.setHex(0x00ff00); // Green
        projectile.mesh.scale.set(1, 1, 3); // Long bolt
        
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
