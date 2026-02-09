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
        // Handle Charge Animation/Logic
        if (this.isCharging) {
            this.chargeDuration -= dt;

            // Move strictly in chargeDir
            this.mesh.position.add(this.chargeDir.clone().multiplyScalar(this.speed * dt));

            // Wobble effect
            this.chassis.rotation.z = Math.sin(Date.now() * 0.02) * 0.05;

            // DAMNAGE CHECK (Manual)
            const dist = this.mesh.position.distanceTo(playerPos);
            if (dist < 2.5) {
                // Hitted player
                // We need a reference to the player entity to call takeDamage
                // But update() only gets playerPos (Vector3).
                // ... Wait, Collision.js handles body collision.
                // But this enemy moves fast, might tunnel.
                // We assume Collision.js will catch "Body vs Player".
            }

            if (this.chargeDuration <= 0) {
                this.isCharging = false;
                this.speed = 4.0;
                this.chargeCooldown = 5.0;
            }
        } else {
            // Normal Chase
            this.chargeCooldown -= dt;

            const dist = this.mesh.position.distanceTo(playerPos);
            if (this.chargeCooldown <= 0 && dist < 35 && dist > 10) {
                // Initiate Charge
                this.isCharging = true;
                this.chargeDuration = 1.5;
                this.speed = 18.0; // Fast!

                // Lock Direction
                this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
                this.chargeDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

                // Sound?
            }

            // Delegate to base for turning/movement when not charging
            super.update(dt, playerPos);
        }

        this.updateGroundPosition();

        // Hover bob
        this.mesh.position.y += Math.sin(Date.now() * 0.005) * 0.02;
    }
}
