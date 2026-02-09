import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class NinjaEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);

        this.hp = 100;
        this.speed = 8.0;
        this.damage = 45;
        this.scoreValue = 300;
        this.attackRange = 2.5;
        this.attackCooldown = 0;

        this.stealthTimer = 0;
        this.isStealth = false;
    }

    _createMesh() {
        const group = new THREE.Group();

        // --- CYBER NINJA AESTHETIC ---
        // Synthetic muscle suit. Black/Purple.
        this.bodyMat = new THREE.MeshStandardMaterial({
            color: 0x110022,
            roughness: 0.2,
            metalness: 0.6,
            transparent: true,
            opacity: 1.0
        });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 1.0 });

        // 1. Body
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.7, 6), this.bodyMat);
        torso.position.y = 1.0;
        group.add(torso);

        // 2. Head (Visor)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), this.bodyMat);
        head.position.y = 1.5;
        group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.15), neonMat);
        visor.position.set(0, 1.5, 0.15);
        group.add(visor);

        // scarf?

        // 3. Limbs
        const limbGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.8);

        // Arm holding Katana
        const rArm = new THREE.Mesh(limbGeo, this.bodyMat);
        rArm.position.set(0.4, 1.1, 0.2);
        rArm.rotation.x = -Math.PI / 4;
        rArm.rotation.z = -Math.PI / 4;
        group.add(rArm);

        // KATANA
        const katanaGeo = new THREE.BoxGeometry(0.05, 1.5, 0.08); // Thin blade
        const katana = new THREE.Mesh(katanaGeo, new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x5500aa,
            metalness: 1.0,
            roughness: 0.1
        }));
        katana.position.set(0, -0.6, 0.2);
        katana.rotation.x = Math.PI / 2; // Blade out
        rArm.add(katana);
        this.weapon = katana;

        return group;
    }

    update(dt, playerPos) {
        // Stealth Logic
        const dist = this.mesh.position.distanceTo(playerPos);

        this.stealthTimer += dt;

        if (!this.isStealth && this.stealthTimer > 4.0 && dist > 10) {
            // Enter Stealth
            this.enterStealth();
        } else if (this.isStealth) {
            // In Stealth: Boost Speed
            // Exit if close to player or timer expires
            if (dist < 8.0 || this.stealthTimer > 4.0) {
                this.exitStealth();
                // Dash attack?
                this.speed = 12.0; // Sprint burst
                setTimeout(() => this.speed = 8.0, 1000);
            }
        }

        // Behavior
        if (dist <= this.attackRange) {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 1.0;
                this.playAnimation('attack');
            }
        }

        super.update(dt, playerPos);
        this.updateGroundPosition();
    }

    enterStealth() {
        this.isStealth = true;
        this.stealthTimer = 0;
        this.speed = 10.0;

        // Visuals
        this.setOpacity(0.1);
    }

    exitStealth() {
        this.isStealth = false;
        this.stealthTimer = 0;
        this.setOpacity(1.0);
    }

    setOpacity(val) {
        this.mesh.traverse(child => {
            if (child.material) {
                child.material.opacity = val;
                child.material.transparent = true;
            }
        });
    }

    animAttack(t) {
        // Quick Slash
        if (this.weapon) {
            this.weapon.rotation.z = Math.sin(t * 20) * 1.5;
        }
    }
}
