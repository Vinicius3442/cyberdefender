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
    }

    _createMesh() {
        const group = new THREE.Group();

        // Heavy Armor Body
        const matArmor = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.4,
            metalness: 0.8
        });
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), matArmor);
        torso.position.y = 1.0;
        group.add(torso);
        
        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 1.0, 0.4);
        const leftLeg = new THREE.Mesh(legGeo, matArmor);
        leftLeg.position.set(-0.3, 0.5, 0);
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeo, matArmor);
        rightLeg.position.set(0.3, 0.5, 0);
        group.add(rightLeg);

        // Head (Rectangular Helmet)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), matArmor);
        head.position.y = 1.7;
        group.add(head);
        
        // Visor (Glowing slit)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.26), new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff }));
        visor.position.y = 1.7;
        visor.position.z = 0.13;
        group.add(visor);

        // Huge Energy Shield
        const shieldGeo = new THREE.BoxGeometry(1.4, 1.8, 0.1);
        const shieldMat = new THREE.MeshStandardMaterial({ 
            color: 0x00aaff, 
            transparent: true, 
            opacity: 0.4,
            emissive: 0x0044aa,
            emissiveIntensity: 0.8,
            roughness: 0.0,
            metalness: 0.9
        });
        
        // Shield frame
        const frameGeo = new THREE.BoxGeometry(1.5, 1.9, 0.05);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 1.0, 0.6);
        group.add(frame);
        
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.set(0, 1.0, 0.6); // Front
        group.add(this.shieldMesh);
        
        // Shield Generator effects?
        
        return group;
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
