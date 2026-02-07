import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class AssassinEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 80;
        this.speed = 4.0; // Normal speed when patrol
        this.damage = 40; 
        this.scoreValue = 300;
        this.attackRange = 2.0;
        
        this.stealthTimer = 0;
        this.isStealth = true; // Starts in stealth
        this.dashCooldown = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        // Sleek "Phantom" Model
        const geometry = new THREE.CylinderGeometry(0.3, 0.2, 1.7, 8);
        
        // Predator Material (Refraction/Distortion)
        this.stealthMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 1.0, // Glass-like
            thickness: 1.0, // Volume
            ior: 1.5, // Refraction index
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: 1.0 // Needed for transmission
        });

        // Visible Material (Dark Tech)
        this.visibleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x220022
        });

        this.material = this.stealthMaterial; // Start stealth
        
        const body = new THREE.Mesh(geometry, this.material);
        body.position.y = 0.85;
        group.add(body);
        this.bodyMesh = body;
        
        // Energy Blades
        const bladeGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, transparent: true, opacity: 0.8 });
        
        this.leftBlade = new THREE.Mesh(bladeGeo, bladeMat);
        this.leftBlade.position.set(-0.4, 1.0, 0.3);
        this.leftBlade.rotation.x = Math.PI/2;
        group.add(this.leftBlade);

        this.rightBlade = new THREE.Mesh(bladeGeo, bladeMat);
        this.rightBlade.position.set(0.4, 1.0, 0.3);
        this.rightBlade.rotation.x = Math.PI/2;
        group.add(this.rightBlade);

        // Hide blades in stealth
        this.leftBlade.visible = false;
        this.rightBlade.visible = false;
        
        return group;
    }

    update(dt, playerPos) {
        const dist = this.mesh.position.distanceTo(playerPos);
        
        // Stealth Logic
        if (this.isStealth) {
            // Predator Shimmer Effect
            // Animate IOR and Roughness slightly to "warp" background
            const time = Date.now() * 0.002;
            this.stealthMaterial.ior = 1.1 + Math.sin(time) * 0.1; 
            this.stealthMaterial.roughness = 0.1 + Math.abs(Math.cos(time * 2)) * 0.2;
            
            // If very close or ignoring stealth
            if (dist < 5.0) {
                this.reveal();
            }
            this.speed = 5.0;
        } else {
            // Visible
            this.speed = 8.0; // Sprint to attack
            
            // Re-enter stealth if far away?
            this.stealthTimer += dt;
            if (this.stealthTimer > 5.0 && dist > 15.0) {
                this.enterStealth();
            }
        }

        super.update(dt, playerPos);
        this.updateGroundPosition();
        
        // Attack Anim
        if (dist < 2.5 && !this.isStealth) {
             // Attack visual
             this.leftBlade.rotation.z += 10 * dt;
             this.rightBlade.rotation.z -= 10 * dt;
        }
    }

    reveal() {
        if (!this.isStealth) return;
        this.isStealth = false;
        
        // Switch Material
        this.bodyMesh.material = this.visibleMaterial;
        
        this.leftBlade.visible = true;
        this.rightBlade.visible = true;
        this.stealthTimer = 0;
    }

    enterStealth() {
        this.isStealth = true;
        
        // Switch Material
        this.bodyMesh.material = this.stealthMaterial;

        this.leftBlade.visible = false;
        this.rightBlade.visible = false;
        this.stealthTimer = 0;
    }

    takeDamage(amount) {
        this.reveal(); // Always reveal on hit
        super.takeDamage(amount);
    }
}
