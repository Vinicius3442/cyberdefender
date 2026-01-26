import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class SniperEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.mesh.material.color.setHex(0x004400); // Dark Green
        this.hp = 40;
        this.speed = 0; // Stationary mostly
        this.attackRange = 40;
        this.shootCooldown = 3.0;
        this.shootRate = 4.0; // Slow fire
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

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
        projectile.velocity.multiplyScalar(3.0); // Very fast (60 speed)
        projectile.damage = 40;
        projectile.mesh.material.color.setHex(0xff00ff); // Purple laser

        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
