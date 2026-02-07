import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class MountedKnightEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 250; 
        this.speed = 4.0; // Base speed
        this.damage = 40; 
        this.scoreValue = 250;
        this.attackRange = 4.0; // Charge hit range
        
        this.chargeCooldown = 5.0;
        this.chargeTimer = 0;
        this.isCharging = false;
        this.chargeDuration = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        // Speeder Bike Body
        const matBike = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.8 });
        
        // Main Fuselage
        const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 2.5), matBike);
        fuselage.position.y = 0.6;
        group.add(fuselage);

        // Engines (Side)
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.2, 1.5, 12);
        const matEngine = new THREE.MeshStandardMaterial({ color: 0x555555, emissive: 0x0011ff, emissiveIntensity: 0.2 });
        
        const leftEng = new THREE.Mesh(engineGeo, matEngine);
        leftEng.rotation.x = Math.PI/2;
        leftEng.position.set(-0.6, 0.6, -0.2);
        group.add(leftEng);

        const rightEng = new THREE.Mesh(engineGeo, matEngine);
        rightEng.rotation.x = Math.PI/2;
        rightEng.position.set(0.6, 0.6, -0.2);
        group.add(rightEng);

        // Rider (Integrated)
        const matRider = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), matRider);
        torso.position.set(0, 1.2, -0.2);
        torso.rotation.x = Math.PI/8; // Leaning forward
        group.add(torso);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3), matRider);
        head.position.set(0, 1.7, 0.1);
        group.add(head);

        // Heavy Lance
        const lanceGeo = new THREE.CylinderGeometry(0.05, 0.15, 4.0, 8);
        const lanceMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.5 });
        const lance = new THREE.Mesh(lanceGeo, lanceMat);
        lance.rotation.x = Math.PI / 2;
        lance.position.set(0.6, 1.0, 1.5); // Forward sticking
        group.add(lance);

        // Engine Trails? (Particles handles this usually, but we can add static glow)

        return group;
    }

    update(dt, playerPos) {
        const dist = this.mesh.position.distanceTo(playerPos);
        
        // Charge Logic
        if (this.isCharging) {
            // Locked direction, high speed
            this.speed = 15.0; // Super fast
            this.chargeDuration -= dt;
            
            // Move forward (override super.update logic partially?)
            // super.update handles movement towards player usually.
            // We need to override movement to be straight line.
            // For now, let's rely on super.update with high speed but lock rotation?
            // Actually super.update always looksAt player.
            // We need to LOCK rotation during charge.
            
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
            this.mesh.position.add(forward.multiplyScalar(this.speed * dt));
            
            if (this.chargeDuration <= 0) {
                this.isCharging = false;
                this.speed = 4.0;
                this.chargeCooldown = 5.0; // Reset CD
            }

            // Hit check logic is in Collision system, relying on box. 
            // High speed collisions might tunnel, Collision.js has sub-stepping for projectiles but not enemies.
            // Should be fine for now.

            return; // Skip normal update
        } else {
            // Normal behavior
            this.chargeCooldown -= dt;
            
            // Prepare Charge
            if (this.chargeCooldown <= 0 && dist < 40 && dist > 10) {
                // Start Charge
                this.isCharging = true;
                this.chargeDuration = 2.0; // 2 seconds of charge
                
                // Aim at player NOW
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
                
                // Sound/Visual cue
            }
        
            super.update(dt, playerPos);
            this.updateGroundPosition();
        }
    }
}
