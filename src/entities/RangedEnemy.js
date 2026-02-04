import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class RangedEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.hp = 30; // Normal
        this.speed = 3.5;
        this.attackRange = 25; // Increase range slightly
        this.attackCooldown = 1.5; // Faster shooting (was 2.0)
        this.attackTimer = 0;
        this.lastAttackTime = 0;
    }

    _createMesh() {
        // Standard Droid
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), mat);
        head.position.y = 1.3;
        group.add(head);

        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.6), mat);
        torso.position.y = 0.9;
        group.add(torso);

        // Eye Visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        visor.position.set(0, 1.3, 0.1);
        group.add(visor);

        // Blaster Arm
        const blaster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        blaster.position.set(0.3, 1.0, 0.2);
        group.add(blaster);

        group.scale.set(1.3, 1.3, 1.3);
        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        const dist = this.mesh.position.distanceTo(playerPosition);

        // Look at player
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        if (dist > this.attackRange) {
            // Move closer
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
            
            // Snap to ground
            this.updateGroundPosition();
        } else {
            // Shoot
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.shoot(playerPosition);
                this.attackTimer = this.attackCooldown;
            }
        }
    }

    shoot(targetPos) {
        // Calculate direction
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.mesh.position)
            .normalize();

        // Spawn projectile slightly in front
        const spawnPos = this.mesh.position.clone().add(direction.clone().multiplyScalar(1.5));
        spawnPos.y += 0.5; // Shoot from "chest" height

        const projectile = new Projectile(spawnPos, direction, false); // false = enemy projectile
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
