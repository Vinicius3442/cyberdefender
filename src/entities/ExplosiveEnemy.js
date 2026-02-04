import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class ExplosiveEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.setSkinColor(0xffaa00); // Orange
        this.hp = 20; // Low HP
        this.speed = 8.0; // Fast
        this.damage = 80; // High damage (explosion)
        
        // Add flashing light
        this.flashTimer = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.7 });
        const bombMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
        this.lightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 });

        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), metalMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.y = 0.3;
        group.add(wheel);

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), bombMat);
        body.position.y = 0.8;
        group.add(body);

        const light = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), this.lightMat);
        light.position.set(0, 0.9, 0.3);
        group.add(light);

        group.scale.set(1.5, 1.5, 1.5);
        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Flash Logic
        this.flashTimer += dt * 10; // Fast blink
        this.lightMat.emissiveIntensity = (Math.sin(this.flashTimer) + 1) * 2.0;

        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        direction.y = 0;

        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    }

    // Logic for exploding on contact handled in Collision.js
}
