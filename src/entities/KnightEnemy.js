import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class KnightEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 120; 
        this.speed = 6.0; // Fast charge
        this.damage = 25; // High melee dmg
        this.scoreValue = 100;
        this.attackRange = 3.0; // Longer reach (Sword)
        
        this.createMesh();
    }

    createMesh() {
        // Robotic Knight Styling
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.6);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa, // Silver/Steel
            metalness: 0.9,
            roughness: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Sword Arm
        const swordGeo = new THREE.BoxGeometry(0.1, 1.5, 0.1);
        const swordMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff });
        this.sword = new THREE.Mesh(swordGeo, swordMat);
        this.sword.position.set(0.6, 0.5, 0.5);
        this.sword.rotation.x = Math.PI/4;
        this.mesh.add(this.sword);
        
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    update(dt, playerPos) {
        super.update(dt, playerPos);
        
        // Spin sword if close
        const dist = this.mesh.position.distanceTo(playerPos);
        if (dist < 5) {
            this.sword.rotation.z += 10 * dt; // Attack anim
        }
    }
}
