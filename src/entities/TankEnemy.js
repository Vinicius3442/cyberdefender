import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class TankEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.mesh.scale.set(2, 2, 2); // Big
        this.mesh.position.y = 2; // Adjust for scale
        this.mesh.material.color.setHex(0x555555); // Grey
        this.hp = 200;
        this.speed = 1.5; // Slow
        this.damage = 30;
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
}
