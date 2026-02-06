import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { Projectile } from '../Projectile.js';

export class ED209 extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        
        // Stats
        this.hp = 2000;
        this.maxHp = 2000;
        this.speed = 2.0; // Slow
        this.damage = 30;
        this.scoreValue = 5000;
        this.attackRange = 40;
        this.attackCooldown = 0;
        
        // Size
        this.width = 3.0;
        this.height = 5.0;
        this.depth = 3.0;

        // Custom Mesh
        this.createMesh();
        
        // Animation State
        this.walkAnim = 0;
        this.turnSpeed = 0.5;
    }

    createMesh() {
        this.mesh = new THREE.Group();
        if (this.position) {
            this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        }

        const matSilver = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
        const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
        const matJoint = new THREE.MeshStandardMaterial({ color: 0x222222 });

        // --- LEGS ---
        // Left Leg
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-1.2, 0, 0);
        const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 1.0), matSilver);
        lThigh.position.y = 1.5;
        this.leftLeg.add(lThigh);
        const lCalf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.8), matBlack);
        lCalf.position.y = 0.5;
        lCalf.position.z = -0.3; // Digitigrade offset
        this.leftLeg.add(lCalf);
        const lFoot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.5), matSilver);
        lFoot.position.y = 0.2;
        this.leftLeg.add(lFoot);
        this.mesh.add(this.leftLeg);

        // Right Leg
        this.rightLeg = this.leftLeg.clone();
        this.rightLeg.position.set(1.2, 0, 0);
        this.mesh.add(this.rightLeg);

        // --- TORSO ---
        this.torso = new THREE.Group();
        this.torso.position.y = 2.5;

        // Main Body (Dome)
        const bodyGeo = new THREE.BoxGeometry(2.5, 1.5, 2.0);
        const body = new THREE.Mesh(bodyGeo, matSilver);
        this.torso.add(body);

        // Cockpit / Visor area
        const visor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.5), matBlack);
        visor.position.set(0, 0.2, 1.0); // Front
        this.torso.add(visor);

        // --- ARMS (Guns) ---
        // Left Gun
        const lGun = new THREE.Group();
        lGun.position.set(-1.8, 0, 0.5);
        const lBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), matBlack);
        lBarrel.rotation.x = Math.PI / 2;
        lBarrel.position.z = 0.6;
        lGun.add(lBarrel);
        const lCase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 1.0), matSilver);
        lGun.add(lCase);
        this.torso.add(lGun);
        this.leftGun = lGun;

        // Right Gun
        const rGun = lGun.clone();
        rGun.position.set(1.8, 0, 0.5);
        this.torso.add(rGun);
        this.rightGun = rGun;

        this.mesh.add(this.torso);

        this.scene.add(this.mesh);
    }

    update(dt, playerPos) {
        if (this.isDead) return;

        const dist = this.mesh.position.distanceTo(playerPos);

        // Rotation (Slow Turn)
        const targetPos = playerPos.clone();
        targetPos.y = this.mesh.position.y;
        this.mesh.lookAt(targetPos); 

        // Movement (Only if far)
        if (dist > 15) {
            const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(this.speed * dt));

            // Walk Animation
            this.walkAnim += dt * 5;
            this.leftLeg.rotation.x = Math.sin(this.walkAnim) * 0.3;
            this.rightLeg.rotation.x = Math.cos(this.walkAnim) * 0.3;
            // Bob torso
            this.torso.position.y = 2.5 + Math.sin(this.walkAnim * 2) * 0.1;
        }

        // Attack (Machine Gun Barrage)
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        if (dist < this.attackRange && this.attackCooldown <= 0) {
            this.fireCannons();
            this.attackCooldown = 2.0 + Math.random(); // 2-3s burst delay
        }
    }

    fireCannons() {
        // Burst Fire (3 shots)
        let shots = 0;
        const burstInterval = setInterval(() => {
            if (this.isDead || shots >= 3) {
                clearInterval(burstInterval);
                return;
            }

            this.shoot(this.leftGun.getWorldPosition(new THREE.Vector3()));
            this.shoot(this.rightGun.getWorldPosition(new THREE.Vector3()));
            
            shots++;
        }, 150);
    }

    shoot(origin) {
        const dir = this.mesh.getWorldDirection(new THREE.Vector3());
        
        // Add spread
        dir.x += (Math.random() - 0.5) * 0.1;
        dir.y += (Math.random() - 0.5) * 0.05;
        dir.z += (Math.random() - 0.5) * 0.1;
        dir.normalize();

        const proj = new Projectile(origin, dir, false);
        proj.velocity.multiplyScalar(1.5); // Faster enemy bullets
        proj.damage = 15;
        
        // Large visual
        proj.mesh.scale.set(2, 2, 2);
        proj.mesh.material.color.setHex(0xffaa00);

        if (this.projectiles) this.projectiles.push(proj);
        this.scene.add(proj.mesh);
    }

    die() {
        super.die();
        // Explosion Effect
        // Managed by Game.js loop checking for instance? Or trigger event?
        // Game.js has specific checks. We should add Instance check there or use event.
        const ev = new CustomEvent('enemy-death', { 
            detail: { type: 'EXPLOSION', position: this.mesh.position.clone() } 
        });
        document.dispatchEvent(ev);
    }
}
