import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class LauncherEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.mesh.material.color.setHex(0x550000); // Dark Red
        this.hp = 60;
        this.speed = 1.5;
        this.shootCooldown = 2.0;
        this.shootRate = 3.0;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Keep distance
        const dist = this.mesh.position.distanceTo(playerPosition);
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        if (dist < 10) {
            // Back away
            const direction = new THREE.Vector3()
                .subVectors(this.mesh.position, playerPosition)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        } else if (dist > 20) {
            // Move closer
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        }

        this.shootCooldown -= dt;
        if (this.shootCooldown <= 0) {
            this.shoot(playerPosition);
            this.shootCooldown = this.shootRate;
        }
    }

    shoot(targetPos) {
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.mesh.position)
            .normalize();

        const spawnPos = this.mesh.position.clone().add(direction.clone().multiplyScalar(1.5));
        spawnPos.y += 0.5;

        const projectile = new Projectile(spawnPos, direction, false);
        projectile.isExplosive = true;
        projectile.explosionRadius = 3.0;
        projectile.damage = 30;
        projectile.mesh.scale.set(2, 2, 2); // Big rocket

        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
