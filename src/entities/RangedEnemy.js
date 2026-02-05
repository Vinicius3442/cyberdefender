import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class RangedEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.hp = 40; 
        this.speed = 3.0; // Floating
        this.attackRange = 25;
        this.attackCooldown = 2.0;
        this.attackTimer = 0;
        
        // Parts for animation - initialized in _createMesh
        // this.headMesh = null; 
        // this.gunArm = null;
        this.hoverOffset = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.7 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan Eyes

        // Main Chassis (Floating)
        const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.1, 0.8, 8), armorMat);
        chassis.position.y = 1.0;
        group.add(chassis);
        this.chassisMesh = chassis;

        // Head (Floating above chassis)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.3), armorMat);
        head.position.y = 1.5;
        group.add(head);
        this.headMesh = head;

        // Eye (Cyclops)
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2), glowMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(0, 1.5, 0.1);
        group.add(eye);
        this.eyeMesh = eye;
        
        // Antenna
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), armorMat);
        ant.position.set(0.1, 1.75, 0);
        group.add(ant);

        // Weapon Arm (Right, floating)
        const armGroup = new THREE.Group();
        armGroup.position.set(0.4, 1.0, 0.2);
        
        const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        armGroup.add(blaster);
        
        // Glow tip
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), glowMat);
        tip.position.z = 0.35;
        armGroup.add(tip);

        group.add(armGroup);
        this.gunArm = armGroup;

        // Shield/Left Arm (Left, floating)
        const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.3), armorMat);
        leftPlate.position.set(-0.4, 1.0, 0);
        group.add(leftPlate);
        this.leftPlate = leftPlate;
        
        // Hover thruster logic visual?
        const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), glowMat);
        thruster.rotation.x = Math.PI;
        thruster.position.y = 0.5;
        group.add(thruster);

        group.scale.set(1.2, 1.2, 1.2);
        return group;
    }

    update(dt, playerPosition) {
        super.update(dt, playerPosition); // Updates animations
        
        if (this.isDead && this.playingDeathAnim) {
             // Death anim logic in animDie
             return;
        }
        if (this.isDead) return;

        // Hover Effect
        this.hoverOffset += dt * 3;
        this.mesh.position.y = (this.scene.userData.getTerrainHeight ? this.scene.userData.getTerrainHeight(this.mesh.position.x, this.mesh.position.z) : 0) 
                               + 0.5 + Math.sin(this.hoverOffset) * 0.2; // Hover height

        const dist = this.mesh.position.distanceTo(playerPosition);
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        if (dist > this.attackRange) {
            // Move
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        } else {
            // Attack logic
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.shoot(playerPosition);
                this.attackTimer = this.attackCooldown;
                this.playAnimation('attack');
            }
        }
    }

    shoot(targetPos) {
        // Aim at player center (approx 1.0 unit high) instead of feet
        const aimTarget = targetPos.clone().add(new THREE.Vector3(0, 1.2, 0));

        const direction = new THREE.Vector3()
            .subVectors(aimTarget, this.mesh.position)
            .normalize();

        const spawnPos = this.gunArm.getWorldPosition(new THREE.Vector3());
        
        // Recalculate direction from actual gun muzzle to target
        // The previous calculation was from Body Center to Target.
        // Gun is offset. To be perfect, we should aim from GUN to TARGET.
        const gunDirection = new THREE.Vector3()
            .subVectors(aimTarget, spawnPos)
            .normalize();

        spawnPos.add(gunDirection.clone().multiplyScalar(0.5)); 

        const projectile = new Projectile(spawnPos, gunDirection, false);
        projectile.mesh.material.color.setHex(0x00ffff); // Cyan lasers
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
    
    // Animations
    animAttack(t) {
        // Recoil
        if (t < 0.1) {
            this.gunArm.position.z -= 0.2; // Back
        } else {
            // Recover
            this.gunArm.position.z = THREE.MathUtils.lerp(this.gunArm.position.z, 0.2, 0.2);
            if (t > 0.5) this.currentAnim = null;
        }
    }

    animDie(t) {
        // Head pops off
        if (t < 1.0) {
            this.headMesh.position.y += 0.05;
            this.headMesh.rotation.x += 0.2;
            this.headMesh.rotation.z += 0.1;
            
            // Chassis drops
            this.chassisMesh.rotation.z += 0.05;
            this.mesh.position.y -= 0.02;
        }
        
        // Arms scatter
        this.gunArm.position.x += 0.01;
        this.leftPlate.position.x -= 0.01;
        
        // Dim eyes
        if (t > 0.5) {
            this.eyeMesh.visible = false;
        }
    }
}
