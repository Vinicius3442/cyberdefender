import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class MeleeEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.mesh.material.color.setHex(0xff0000); // Red
        this.speed = 4.0;
        this.hp = 50;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Simple seek behavior
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();

        // Ignore Y difference for movement (stay on ground)
        direction.y = 0;
        direction.normalize();

        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    }
}
