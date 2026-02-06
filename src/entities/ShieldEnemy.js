import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class ShieldEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 200; // Tanky
        this.speed = 3.0; // Slow
        this.damage = 15;
        this.scoreValue = 150;
        this.shieldHealth = 100;
        this.isShieldActive = true;
        
        // Create Visuals
        this.createMesh();
    }

    createMesh() {
        // Body (Dark Grey Armor)
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Head (Helmet)
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        head.position.y = 1.0;
        this.mesh.add(head);
        
        // Energy Shield (Front)
        const shieldGeo = new THREE.BoxGeometry(1.2, 1.5, 0.1);
        const shieldMat = new THREE.MeshStandardMaterial({ 
            color: 0x0088ff, 
            transparent: true, 
            opacity: 0.6,
            emissive: 0x0044aa,
            emissiveIntensity: 0.5
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.set(0, 0, 0.6); // Front
        this.mesh.add(this.shieldMesh);
        
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        // Shield blocking logic
        if (this.isShieldActive) {
            // Check angle? For now, 80% damage reduction if shield is up
            // Or absorb completely until broken
            this.shieldHealth -= amount;
            
            // Visual feedback
            this.shieldMesh.material.opacity = 0.8;
            setTimeout(() => { if(this.shieldMesh) this.shieldMesh.material.opacity = 0.4; }, 100);
            
            if (this.shieldHealth <= 0) {
                this.isShieldActive = false;
                this.shieldMesh.visible = false;
                // Shield break fx
            }
            return; // Blocked
        }
        
        super.takeDamage(amount);
    }
}
