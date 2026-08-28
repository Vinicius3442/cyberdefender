import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class ShieldEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);

        this.hp = 150; // Reduced from 250
        this.speed = 2.5; // Slow approach
        this.damage = 15;
        this.scoreValue = 150;
        this.shieldHealth = 100; // Reduced from 150
        this.isShieldActive = true;
        this.attackRange = 3.0;
        this.attackCooldown = 0;

        this.hitboxSize = new THREE.Vector3(1.8, 2.2, 1.8);
        this.hitboxOffset = new THREE.Vector3(0, 1.1, 0);
    }

    _createMesh() {
        const group = new THREE.Group();

        // --- RIOT MECH AESTHETIC ---
        // Heavy Industrial. Dark Blue/Grey + Orange warning lights.

        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x112233,
            roughness: 0.5,
            metalness: 0.7
        });

        const techMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // Orange

        // 1. Torso (Wide)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.6), armorMat);
        torso.position.y = 1.0;
        group.add(torso);

        // Warning Stripe Texture? (Procedural fix: just use boxes)
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.62), techMat);
        stripe.position.y = 1.3;
        group.add(stripe);

        // 2. Legs (Stout)
        const legGeo = new THREE.BoxGeometry(0.35, 0.9, 0.5);
        const lLeg = new THREE.Mesh(legGeo, armorMat);
        lLeg.position.set(-0.3, 0.45, 0);
        group.add(lLeg);
        this.leftLeg = lLeg;

        const rLeg = lLeg.clone();
        rLeg.position.set(0.3, 0.45, 0);
        group.add(rLeg);
        this.rightLeg = rLeg;

        // 3. Head (Dome)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), armorMat);
        head.position.y = 1.5;
        group.add(head);

        // Mono-Eye Camera
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15), techMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(0, 1.5, 0.25);
        group.add(eye);
        this.eyeMesh = eye;

        // 4. ENERGY SHIELD (Left Arm)
        const shieldGroup = new THREE.Group();

        // Emitter
        const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x555555 }));
        shieldGroup.add(emitter);

        // Force Field
        const shieldGeo = new THREE.BoxGeometry(1.5, 2.0, 0.05);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.3,
            emissive: 0x0044aa,
            emissiveIntensity: 1.0,
            side: THREE.DoubleSide
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.set(0.4, 0, 0.2); // Offset from emitter
        shieldGroup.add(this.shieldMesh);

        shieldGroup.position.set(0.6, 1.2, 0.6); // Held in front
        // Rotating slightly
        shieldGroup.rotation.y = -Math.PI / 8;

        group.add(shieldGroup);
        this.shieldGroup = shieldGroup;

        // 5. Baton (Right Arm)
        const batonGroup = new THREE.Group();
        const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        baton.rotation.x = Math.PI / 2;
        batonGroup.add(baton);

        // Shock Tip
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), techMat);
        tip.position.z = 0.4;
        batonGroup.add(tip);

        batonGroup.position.set(-0.6, 1.1, 0.4);
        group.add(batonGroup);
        this.weapon = batonGroup;

        return group;
    }

    update(dt, playerPos) {
        super.update(dt, playerPos);
        this.updateGroundPosition();

        if (this.isDead) return;

        const dist = this.mesh.position.distanceTo(playerPos);

        // 1. Face Player (Slow turn?)
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // 2. Advance Logic
        if (dist > this.attackRange) {
            // Move forward slowly (Shield Up)
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
            this.mesh.position.add(forward.multiplyScalar(this.speed * dt));

            // Anim
            this.animWalk(dt);
        } else {
            // Attack
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 2.0;
                this.playAnimation('attack');
                // Damage handled by collision if player touches, 
                // but we can add lunge here too if we want active strikes
            }
        }
    }

    takeDamage(amount) {
        // Shield blocking logic
        if (this.isShieldActive) {
            // Check direction? For now assume frontal block if facing player
            // Reduce damage by 50% (User feedback: "Invincible" was bad)
            const blockedAmount = amount * 0.5;
            const appliedAmount = amount * 0.5;

            this.shieldHealth -= amount; // Shield takes full damage
            super.takeDamage(appliedAmount); // HP takes reduced

            // Visual feedback
            this.shieldMesh.material.opacity = 0.8;
            this.shieldMesh.material.emissiveIntensity = 2.0;
            setTimeout(() => {
                if (this.shieldMesh) {
                    this.shieldMesh.material.opacity = 0.3;
                    this.shieldMesh.material.emissiveIntensity = 1.0;
                }
            }, 100);

            if (this.shieldHealth <= 0) {
                this.isShieldActive = false;
                this.shieldMesh.visible = false;
                // Shield break fx
                // TODO: Sound or particles
            }
            return;
        }

        super.takeDamage(amount);
    }

    animWalk(dt) {
        const time = Date.now() * 0.005; // Slow stomp
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = Math.sin(time) * 0.4;
            this.rightLeg.rotation.x = Math.cos(time) * 0.4;
        }
        // Bob with shield
        if (this.shieldGroup) {
            this.shieldGroup.position.y = 1.2 + Math.sin(time * 2) * 0.05;
        }
    }

    animAttack(t) {
        // Baton Strike
        if (this.weapon) {
            // t is 0..duration (e.g. 0.5s)
            // Swing down
            const angle = Math.sin(t * 10) * Math.PI / 2;
            this.weapon.rotation.x = angle;
        }
    }

    animDie(t) {
        // Shield drops, Mech falls back
        this.mesh.rotation.x = -t * Math.PI / 2; // Fall back

        if (this.shieldGroup) {
            this.shieldGroup.position.y -= 0.05;
            this.shieldGroup.rotation.x += 0.1;
        }

        // Light flickers out
        if (t > 0.5 && this.eyeMesh) {
            this.eyeMesh.visible = false;
        }
    }
}
