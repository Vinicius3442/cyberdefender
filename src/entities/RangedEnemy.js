import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class RangedEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.mesh.material.color.setHex(0x0000ff); // Blue
        this.hp = 30;
        this.speed = 2.5;
        this.attackRange = 15;
        this.shootCooldown = 0;
        this.shootRate = 2.0; // Seconds between shots
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
        } else {
            // Shoot
            this.shootCooldown -= dt;
            if (this.shootCooldown <= 0) {
                this.shoot(playerPosition);
                this.shootCooldown = this.shootRate;
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
