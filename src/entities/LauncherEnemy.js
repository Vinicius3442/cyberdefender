import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class LauncherEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        
        this.hp = 80; // Medium tanky
        this.speed = 1.8; // Slow
        this.attackRange = 30;
        this.attackCooldown = 4.0; 
        this.attackTimer = 0;
        
        // Parts
        // Parts - initialized in _createMesh
        // this.torsoMesh = null;
        // this.launchers = [];
    }

    _createMesh() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.7 }); // Dark Blue
        const trackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        
        // Base (Tracks)
        const leftTrack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.8), trackMat);
        leftTrack.position.set(-0.4, 0.2, 0);
        group.add(leftTrack);
        
        const rightTrack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.8), trackMat);
        rightTrack.position.set(0.4, 0.2, 0);
        group.add(rightTrack);
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.6), mat);
        torso.position.y = 0.8;
        group.add(torso);
        this.torsoMesh = torso;
        
        // Head / Cockpit
        const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.2 }));
        cockpit.position.set(0, 1.25, 0.1);
        group.add(cockpit);
        
        // Missile Pods
        this.launchers = [];
        const offsets = [-0.6, 0.6];
        offsets.forEach(x => {
            const podGroup = new THREE.Group();
            podGroup.position.set(x, 1.0, -0.2);
            
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), mat);
            podGroup.add(box);
            
            // Tubes
            for(let i=0; i<4; i++) {
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1), new THREE.MeshBasicMaterial({ color: 0x000000 }));
                tube.rotation.x = Math.PI / 2;
                tube.position.set((i%2)*0.15 - 0.075, (Math.floor(i/2))*0.15 - 0.075, 0.3);
                podGroup.add(tube);
            }
            
            group.add(podGroup);
            this.launchers.push(podGroup);
        });

        group.scale.set(1.5, 1.5, 1.5);
        return group;
    }

    update(dt, playerPosition) {
        super.update(dt, playerPosition); // Animations
        if (this.isDead && !this.playingDeathAnim) return;

        const dist = this.mesh.position.distanceTo(playerPosition);
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
        this.updateGroundPosition();
        
        if (this.isDead && this.playingDeathAnim) return;

        // AI Logic
        if (dist < 10) {
            // Back away
            const direction = new THREE.Vector3().subVectors(this.mesh.position, playerPosition).normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        } else if (dist > 20) {
            // Approach
            const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        }
        
        // Fire Logic
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.shoot(playerPosition);
            this.playAnimation('attack');
            this.attackTimer = this.attackCooldown;
        }
    }
    
    animAttack(t) {
        // Recoil Pods
        if (t < 0.2) {
            this.launchers.forEach(p => p.rotation.x = -0.5);
        } else {
            this.launchers.forEach(p => p.rotation.x = THREE.MathUtils.lerp(p.rotation.x, 0, 0.1));
            if (t > 1.0) this.currentAnim = null;
        }
    }
    
    animDie(t) {
        // Fall back and Crumble
        if (t < 1.5) {
            this.mesh.rotation.x = -Math.PI / 2 * Math.min(t * 1.5, 1);
            this.mesh.rotation.z = Math.sin(t * 20) * 0.1; // Shake
            this.mesh.position.y -= 1.0 * t * 0.5; // Sink
        }
    }

    shoot(targetPos) {
        // Aim at player center (Chest)
        // Player pos is Eye Level (1.6). Chest is ~1.2. Offset: -0.4
        const aimTarget = targetPos.clone().add(new THREE.Vector3(0, -0.4, 0));
        
        const direction = new THREE.Vector3()
            .subVectors(aimTarget, this.mesh.position)
            .normalize();

        // Fire from alternating pods? Both for now.
        const spawnPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)); // Center top
        spawnPos.add(direction.clone().multiplyScalar(1.0));

        // Recalculate direction from Muzzle to Target
        // Origin was from body center, causing parallax overshot
        direction.subVectors(aimTarget, spawnPos).normalize();

        const projectile = new Projectile(spawnPos, direction, false);
        projectile.isExplosive = true;
        projectile.explosionRadius = 4.0;
        projectile.damage = 30;
        projectile.mesh.scale.set(2, 2, 2); 
        // Visuals
        projectile.mesh.material = new THREE.MeshStandardMaterial({ color: 0xffff00 }); // Yellow Warhead
        
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
