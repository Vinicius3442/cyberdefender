import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class ExplosiveEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.mesh.material.color.setHex(0xffaa00); // Orange
        this.hp = 20; // Low HP
        this.speed = 8.0; // Fast
        this.damage = 80; // High damage (explosion)
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        direction.y = 0;

        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    }

    // Logic for exploding on contact handled in Collision.js
}
