import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class NinjaEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 80;
        this.speed = 9.0; // Very fast
        this.damage = 50; // Critical hit
        this.scoreValue = 300;
        
        this.stealthTimer = 0;
        this.isStealth = false;
    }

    _createMesh() {
        const group = new THREE.Group();

        // Sleek Black Robot
        const geometry = new THREE.CylinderGeometry(0.4, 0.3, 1.7, 8);
        this.material = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
        });
        const body = new THREE.Mesh(geometry, this.material);
        body.position.y = 0.85;
        group.add(body);
        
        // Red Eye Visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        visor.position.set(0, 1.45, 0.2);
        group.add(visor);
        
        return group;
    }

    update(dt, playerPos) {
        // Ninja Logic: Flank?
        // Simple: If visible, run towards. If stuck or timer, vanish.
        
        this.stealthTimer += dt;
        if (this.stealthTimer > 5.0 && !this.isStealth) {
            // Enter Stealth
            this.isStealth = true;
            this.material.opacity = 0.1; // Almost invisible
            this.stealthTimer = 0;
            this.speed = 12.0; // Sprint while stealth
        } else if (this.stealthTimer > 3.0 && this.isStealth) {
            // Exit Stealth near player to strike
            this.isStealth = false;
            this.material.opacity = 1.0;
            this.stealthTimer = 0;
            this.speed = 9.0;
            
            // Smoke puff?
        }

        super.update(dt, playerPos);
    }
}
