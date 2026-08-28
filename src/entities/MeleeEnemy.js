import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class MeleeEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.speed = 4.5; // Slightly faster
        this.hp = 60;
        this.scoreValue = 150;
        this.damage = 15;

        // Custom Spider Hitbox for 100% Tangibility
        this.hitboxSize = new THREE.Vector3(2.4, 1.6, 2.4);
        this.hitboxOffset = new THREE.Vector3(0, 0.8, 0);
    }

    _createMesh() {
        const group = new THREE.Group();
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.8 });
        const jointMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, metalness: 0.5 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });

        // --- Body Structure (Cyber-Stalker) ---
        // Main Chassis (Aggressive angled shape)
        const bodyGeo = new THREE.ConeGeometry(0.3, 0.8, 6);
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.rotation.x = Math.PI / 2; // Point forward
        body.scale.set(1, 0.5, 1); // Flattened
        body.position.y = 0.5;
        group.add(body);
        this.bodyMesh = body;

        // Head/Sensor Array
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.3), armorMat);
        head.position.set(0, 0.6, 0.3); // Front/Top
        group.add(head);

        // Mono-Eye
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), glowMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(0, 0.6, 0.45);
        group.add(eye);
        this.eyeMesh = eye; // Ref for blinking/dimming

        // --- Legs (6-Legged Walker) ---
        this.legs = [];
        const legCount = 6;
        for (let i = 0; i < legCount; i++) {
            const side = i % 2 === 0 ? 1 : -1; // Left/Right
            const indexOnSide = Math.floor(i / 2); // 0, 1, 2
            const zOffset = -0.3 + (indexOnSide * 0.3); // Front to back distribution
            
            const legRoot = new THREE.Group();
            legRoot.position.set(side * 0.2, 0.5, zOffset);
            
            // Upper Leg
            const upperGeo = new THREE.BoxGeometry(0.05, 0.05, 0.4);
            const upperLeg = new THREE.Mesh(upperGeo, jointMat);
            upperLeg.position.x = side * 0.2; // Outward
            upperLeg.position.y = 0.1; // Upward
            
            // Lower Leg (Spike)
            const lowerGeo = new THREE.ConeGeometry(0.03, 0.6, 4);
            const lowerLeg = new THREE.Mesh(lowerGeo, armorMat);
            lowerLeg.position.x = side * 0.4; // Further out
            lowerLeg.position.y = -0.3; // Down
            lowerLeg.rotation.z = side * -0.3; // Angled in slightly

            legRoot.add(upperLeg);
            legRoot.add(lowerLeg);
            group.add(legRoot);
            
            this.legs.push({ root: legRoot, upper: upperLeg, lower: lowerLeg, side: side, offset: indexOnSide });
        }

        group.scale.set(1.5, 1.5, 1.5); // Intimidating size
        return group;
    }

    update(dt, playerPosition) {
        // IMPORTANT: Call super to update animation timer
        super.update(dt, playerPosition);

        // If dead and playing animation, prevent movement logic but allow animation
        if (this.isDead) return;

        // Custom Movement Logic
        const dist = this.mesh.position.distanceTo(playerPosition);
        const attackRange = 3.0; // Increased to prevent clipping

        // Look at player
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        if (dist > attackRange) {
             // Move forward
             const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
             this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
             
             // Run Anim
             this.animRun(this.animTimer); // Use centralized timer? Or just Date for cycling
        } else {
             // Attack
             if (this.currentAnim !== 'attack') {
                 this.playAnimation('attack');
             }
        }
        
        this.updateGroundPosition();
    }

    // --- Animations ---
    animRun(t) {
        const speed = 15;
        this.legs.forEach(leg => {
            // Alternating gait
            const phase = leg.side > 0 ? 0 : Math.PI; // Left vs Right phase
            const wave = Math.sin(t * speed + phase + leg.offset); // Leg offset wave
            
            // Move up/down
            leg.root.position.y = 0.5 + Math.abs(Math.sin(wave)) * 0.2;
            
            // Swing forward/back
            leg.root.rotation.y = Math.cos(wave) * 0.3 * leg.side;
        });
        
        // Body bob
        this.bodyMesh.position.y = 0.5 + Math.sin(t * speed * 2) * 0.05;
    }

    animAttack(t) {
        const duration = 0.8;
        const progress = t / duration;

        if (progress < 0.3) {
            // Wind up: Crouch and pull back
            this.mesh.position.y = Math.max(0, this.mesh.position.y - 0.1);
            this.mesh.translateZ(-0.05);
        } else if (progress < 0.5) {
            // Leap Strike
            this.mesh.position.y += 0.2;
            this.mesh.translateZ(0.4);
        } else {
            // Recover
            this.mesh.position.y = Math.max(0, this.mesh.position.y - 0.1);
        }

        if (progress >= 1.0) {
            this.currentAnim = null; // Reset
        }
    }

    animDie(t) {
        // Faster Death (user complaint)
        const duration = 0.8; 
        const progress = t / duration;

        // 1. Legs curl up immediately
        this.legs.forEach(leg => {
            leg.root.rotation.z = THREE.MathUtils.lerp(leg.root.rotation.z, leg.side * Math.PI, 0.1);
            leg.root.scale.setScalar(1.0 - progress * 0.5); // Shrink legs
        });

        // 2. Chassis drops and rolls
        if (progress < 0.5) {
            this.mesh.position.y *= 0.9;
            this.mesh.rotation.x += 0.1; // Fall forward
        }

        // 3. Eye flickers/Dies
        if (this.eyeMesh) {
            this.eyeMesh.visible = Math.random() > progress; // Flicker out
        }

        // 4. Sink into ground faster
        if (progress > 0.6) {
             this.mesh.position.y -= 0.05;
        }
    }
}
