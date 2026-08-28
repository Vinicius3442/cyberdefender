import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class MountedKnightEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);

        this.hp = 300;
        this.speed = 4.0;
        this.damage = 40;
        this.scoreValue = 250;
        this.attackRange = 4.0;

        this.chargeCooldown = 5.0;
        this.chargeDuration = 0;
        this.isCharging = false;
        this.chargeDir = new THREE.Vector3();

        this.hitboxSize = new THREE.Vector3(2.5, 3.2, 3.5);
        this.hitboxOffset = new THREE.Vector3(0, 1.6, 0);
    }

    _createMesh() {
        const group = new THREE.Group();

        // --- CYBER HOVER BIKE ---
        // Sleek, floating, neon-lit.
        const bikeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.8 });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Pink/Red Neon

        // Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2.0), bikeMat);
        chassis.position.y = 0.8;
        group.add(chassis);
        this.chassis = chassis;

        // Engines (Turbines)
        const engineGeo = new THREE.CylinderGeometry(0.35, 0.25, 1.2, 16);
        const engineL = new THREE.Mesh(engineGeo, bikeMat);
        engineL.rotation.x = Math.PI / 2;
        engineL.position.set(-0.6, 0.8, -0.4);
        group.add(engineL);

        const engineR = engineL.clone();
        engineR.position.set(0.6, 0.8, -0.4);
        group.add(engineR);

        // Thruster Glow
        const thrustGeo = new THREE.ConeGeometry(0.2, 0.6, 8);
        const thrustL = new THREE.Mesh(thrustGeo, glowMat);
        thrustL.rotation.x = -Math.PI / 2; // Point back
        thrustL.position.set(0, -0.80, 0); // Relative to engine center... wait
        // Easier: add to engine
        const glowCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), glowMat);
        glowCone.rotation.x = -Math.PI / 2;
        glowCone.position.y = -0.8;
        engineL.add(glowCone); // Attach to engine
        engineR.add(glowCone.clone());

        // Rider (Cyber Knight Torso)
        const riderMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), riderMat);
        torso.position.set(0, 1.4, 0);
        torso.rotation.x = Math.PI / 6; // Lean
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.35), riderMat);
        head.position.set(0, 1.85, 0.2);
        group.add(head);

        // Energy Lance
        const lanceGeo = new THREE.CylinderGeometry(0.02, 0.1, 3.5);
        const lance = new THREE.Mesh(lanceGeo, new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        lance.rotation.x = Math.PI / 2;
        lance.position.set(0.5, 1.3, 1.5);
        group.add(lance);
        this.weapon = lance;

        return group;
    }

    update(dt, playerPos) {
        this.updateAnimations(dt);

        // --- HOVER BIKE MOVEMENT ---
        // Unlike humanoids, this needs smooth turning and momentum.
        const dist = this.mesh.position.distanceTo(playerPos);
        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        toPlayer.y = 0; // Project to ground plane

        const currentDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

        // 1. TURNING
        // Calculate angle to target
        const angle = currentDir.angleTo(toPlayer);
        // Cross product to check left/right
        const cross = new THREE.Vector3().crossVectors(currentDir, toPlayer);

        const turnRate = 2.0 * dt; // Slow turn
        if (angle > 0.05) {
            // Turn towards player
            this.mesh.rotateY(cross.y > 0 ? turnRate : -turnRate);

            // Bank effect (lean)
            this.chassis.rotation.z = THREE.MathUtils.lerp(this.chassis.rotation.z, cross.y > 0 ? -0.3 : 0.3, dt * 2);
        } else {
            // Straighten up
            this.chassis.rotation.z = THREE.MathUtils.lerp(this.chassis.rotation.z, 0, dt * 2);
        }

        // 2. VELOCITY
        if (this.isCharging) {
            this.chargeDuration -= dt;
            // Move fast in current facing direction
            this.mesh.translateZ(this.speed * dt);

            // Stop charge?
            if (this.chargeDuration <= 0) {
                this.isCharging = false;
                this.speed = 4.0;
                this.chargeCooldown = 5.0;
                // Skidding stop?
            }
        } else {
            // Normal behavior: Keep distance or Charge?
            this.chargeCooldown -= dt;

            if (dist > 30) {
                // Too far, speed up
                this.speed = 6.0;
                this.mesh.translateZ(this.speed * dt);
            } else if (dist < 10) {
                // Too close, swerve? Or keep moving to pass by (Hit & Run)
                // If extremely close, slow down to look like maneuvering
                this.speed = 4.0;
                this.mesh.translateZ(this.speed * dt);
            } else {
                // Sweet spot (10-30m) - CHARGE!
                if (this.chargeCooldown <= 0 && angle < 0.2) { // Only charge if roughly facing
                    this.isCharging = true;
                    this.playAnimation('attack', 2.0); // Pre-charge anim?
                    this.speed = 20.0;
                    this.chargeDuration = 2.0; // 2 seconds of dash
                } else {
                    // Cruise
                    this.speed = 4.0;
                    this.mesh.translateZ(this.speed * dt);
                }
            }
        }

        this.updateGroundPosition();

        // Hover Bob
        const hoverH = Math.sin(Date.now() * 0.005) * 0.2;
        this.mesh.position.y += hoverH;
        // Tilt nose up/down based on speed/accel? 
        // For now, simple bob.
    }
}
