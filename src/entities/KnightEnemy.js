import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class KnightEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);

        this.hp = 150;
        this.speed = 7.0; // Fast chase
        this.damage = 25;
        this.scoreValue = 200;
        this.attackRange = 2.5; // Reduced from 4.0 to fix phantom range
        this.attackCooldown = 0;
    }

    takeDamage(amount) {
        // Cyber-Armor: Reduced damage but always shows impact
        // 30% reduction
        const actualDamage = amount * 0.7; // 30% resistance

        // Visual/Audio feedback for armor hit could be added here
        super.takeDamage(actualDamage);
    }

    _createMesh() {
        const group = new THREE.Group();

        // --- CYBER KNIGHT AESTHETIC ---
        // Dark metallic armor with Neon edgework
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.2,
            envMapIntensity: 1.0
        });

        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan Neon
        const jointMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        // 1. Torso (Angular Plate)
        const torsoGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.9, 6);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 1.1;
        group.add(torso);

        // Neon Core
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.3, 6), neonMat);
        core.position.set(0, 1.1, 0.25);
        core.rotation.x = Math.PI / 2;
        group.add(core);

        // 2. Legs (Hydraulic look)
        const legGeo = new THREE.BoxGeometry(0.2, 0.9, 0.3);
        const lLeg = new THREE.Mesh(legGeo, armorMat);
        lLeg.position.set(-0.25, 0.45, 0);

        // Kneepad
        const knee = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.32), neonMat);
        knee.position.y = 0.0;
        knee.position.z = 0.05;
        lLeg.add(knee);

        group.add(lLeg);
        this.leftLeg = lLeg; // Anim ref

        const rLeg = lLeg.clone();
        rLeg.position.set(0.25, 0.45, 0);
        group.add(rLeg);
        this.rightLeg = rLeg; // Anim ref

        // 3. Pauldrons (Spiked)
        const shoulderGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
        const lPaul = new THREE.Mesh(shoulderGeo, armorMat);
        lPaul.position.set(-0.55, 1.5, 0);
        lPaul.rotation.z = Math.PI / 4;
        group.add(lPaul);

        const rPaul = lPaul.clone();
        rPaul.position.set(0.55, 1.5, 0);
        rPaul.rotation.z = -Math.PI / 4;
        group.add(rPaul);

        // 4. Head (Tech Helm)
        const headGeo = new THREE.BoxGeometry(0.35, 0.4, 0.45);
        const head = new THREE.Mesh(headGeo, armorMat);
        head.position.y = 1.75;
        group.add(head);

        // Visor (V-Shape Neon)
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.2), neonMat);
        visor.position.set(0, 1.75, 0.15);
        group.add(visor);

        // Halo?
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 32), neonMat);
        halo.position.set(0, 2.1, 0);
        halo.rotation.x = Math.PI / 2;
        group.add(halo);

        // 5. Digital Greatsword
        const bladeGeo = new THREE.BoxGeometry(0.1, 2.5, 0.4);
        // Gradient shader or just simple neon? Let's use neon for now.
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.8
        });

        this.sword = new THREE.Mesh(bladeGeo, bladeMat);
        this.sword.position.set(0.6, 1.5, 0.4);
        this.sword.rotation.x = Math.PI / 2; // Point forward-ish

        // Sword Handle
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), jointMat);
        hilt.rotation.x = Math.PI / 2;
        hilt.position.y = -1.4;
        this.sword.add(hilt);

        group.add(this.sword);

        return group;
    }

    update(dt, playerPos) {
        super.update(dt, playerPos);
        this.updateGroundPosition();

        if (this.isDead) return;

        // --- AI LOGIC ---
        const dist = this.mesh.position.distanceTo(playerPos);

        // 1. Face Player
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // 2. Chase or Attack
        if (dist > this.attackRange) {
            // Chase
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
            this.mesh.position.add(forward.multiplyScalar(this.speed * dt));

            // Run Anim
            this.animRun(dt);
        } else {
            // Attack
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 1.5; // Seconds
                this.playAnimation('attack');
                // Deal Damage logic is handled by Collision system usually, 
                // but we can also trigger a "swing" that Collision detects.
                // For now, Collision.js checks "Enemies vs Player" constant contact.
                // We should make Collision.js check "Enemy Weapon vs Player"? 
                // Or just keep simple contact damage for now, or "Lunging".

                // Let's lunge forward
                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
                this.mesh.position.add(forward.multiplyScalar(2.0)); // Lunge
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
    }

    animRun(dt) {
        // Simple Leg Swing
        const time = Date.now() * 0.01;
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = Math.sin(time) * 0.5;
            this.rightLeg.rotation.x = Math.cos(time) * 0.5;
        }
        // Bob
        this.mesh.position.y += Math.sin(time * 2) * 0.02;
    }

    animAttack(t) {
        // Sword Swing
        if (this.sword) {
            // Simple chop
            const phase = Math.sin(t * 10); // rapid swing
            this.sword.rotation.x = (Math.PI / 2) - phase;
        }
    }

    animDie(t) {
        // Kneel and fall
        if (t < 0.5) {
            this.mesh.rotation.x = t * Math.PI / 4; // Lean forward
            this.mesh.position.y -= t * 0.05;
        } else {
            this.mesh.rotation.x = Math.PI / 2; // Flat
            this.mesh.position.y = 0.5;
        }

        // Drop Sword
        if (this.sword) {
            this.sword.rotation.x += 0.1;
            this.sword.position.y -= 0.02;
        }
    }
}
