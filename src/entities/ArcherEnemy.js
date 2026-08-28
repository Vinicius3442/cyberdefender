import * as THREE from 'three';
import { RangedEnemy } from './RangedEnemy.js';
import { Projectile } from './Projectile.js';

export class ArcherEnemy extends RangedEnemy {
    constructor(scene, position, projectiles) {
        super(scene, position, projectiles);

        this.hp = 80;
        this.speed = 5.0; // Faster
        this.scoreValue = 120;
        this.attackRange = 35;
        this.minRange = 15; // Back away distance
        this.fireRate = 2.5;
        this.strafeTimer = 0;
        this.strafeDir = 1;

        this.hitboxSize = new THREE.Vector3(1.4, 2.0, 1.4);
        this.hitboxOffset = new THREE.Vector3(0, 1.0, 0);
    }

    _createMesh() {
        const group = new THREE.Group();

        // --- TECH ARCHER AESTHETIC ---
        // Sleek, stealthy look. Dark Green/Grey + Neon Green.
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x223322, roughness: 0.6, metalness: 0.5 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 }); // Neon Green

        // 1. Body (Slim)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.3), armorMat);
        body.position.y = 1.0;
        group.add(body);

        // 2. Head (Hooded / Tech Visor)
        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 4), armorMat);
        hood.position.y = 1.55;
        hood.rotation.y = Math.PI / 4;
        group.add(hood);

        // Eye (Sniper Lens)
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15), neonMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(0, 1.5, 0.15);
        group.add(eye);

        // 3. Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.8, 0.25);
        const lLeg = new THREE.Mesh(legGeo, armorMat);
        lLeg.position.set(-0.2, 0.4, 0);
        group.add(lLeg);
        this.leftLeg = lLeg;

        const rLeg = lLeg.clone();
        rLeg.position.set(0.2, 0.4, 0);
        group.add(rLeg);
        this.rightLeg = rLeg;

        // 4. HOLO-BOW
        const bowGroup = new THREE.Group();
        // Handle
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), armorMat);
        bowGroup.add(handle);

        // Energy Arms (Curved using Torus segments)
        const bowMat = new THREE.MeshBasicMaterial({
            color: 0x33ff33,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const upperBow = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 4, 16, Math.PI / 2), bowMat);
        upperBow.position.y = 0.4;
        upperBow.position.x = 0.6;
        upperBow.rotation.z = Math.PI / 2;
        bowGroup.add(upperBow);

        const lowerBow = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 4, 16, Math.PI / 2), bowMat);
        lowerBow.position.y = -0.4;
        lowerBow.position.x = 0.6;
        lowerBow.rotation.z = Math.PI;
        bowGroup.add(lowerBow);

        bowGroup.position.set(0, 1.2, 0.5); // Hold in front
        // Aiming pose
        bowGroup.rotation.y = -Math.PI / 2;
        bowGroup.rotation.z = Math.PI / 2;

        group.add(bowGroup);
        this.gunArm = bowGroup; // Ref for recoil

        return group;
    }

    update(dt, playerPos) {
        // We override RangedEnemy update completely to implement smarter AI
        this.updateAnimations(dt);
        this.updateGroundPosition();

        if (this.isDead) return;

        const dist = this.mesh.position.distanceTo(playerPos);

        // Face Player
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        // --- SMART AI ---
        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        dirToPlayer.y = 0;

        if (dist < this.minRange) {
            // Flee: Back away
            this.mesh.position.sub(dirToPlayer.multiplyScalar(this.speed * dt));
            this.animRun(dt);
        } else if (dist > this.attackRange) {
            // Chase: Get in range
            this.mesh.position.add(dirToPlayer.multiplyScalar(this.speed * dt));
            this.animRun(dt);
        } else {
            // Strafe mode (Orbit)
            this.strafeTimer -= dt;
            if (this.strafeTimer <= 0) {
                this.strafeTimer = 1.0 + Math.random(); // Change dir every 1-2s
                this.strafeDir = Math.random() > 0.5 ? 1 : -1;
            }

            // Calculate tangent vector
            const strafeVec = new THREE.Vector3(-dirToPlayer.z, 0, dirToPlayer.x).multiplyScalar(this.strafeDir);
            this.mesh.position.add(strafeVec.multiplyScalar(this.speed * 0.5 * dt)); // Slower strafe

            // Shoot logic (only when in comfortable range)
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.shoot(playerPos);
                this.attackTimer = this.fireRate;
                this.playAnimation('attack');
            }
        }
    }

    shoot(targetPos) {
        if (!this.projectiles) return;

        // Lead the target? Simple prediction
        // For now, direct shot with gravity

        const spawnPos = this.gunArm.getWorldPosition(new THREE.Vector3());

        // Aim slightly above target to account for gravity arrow
        const dist = this.mesh.position.distanceTo(targetPos);
        const aimOffset = dist * 0.02; // Aim higher for farther targets

        const aimTarget = targetPos.clone().add(new THREE.Vector3(0, aimOffset, 0));

        const direction = new THREE.Vector3()
            .subVectors(aimTarget, spawnPos)
            .normalize();

        // Create Energy Arrow
        const proj = new Projectile(spawnPos, direction, false);
        proj.velocity.multiplyScalar(1.5); // Fast arrow
        proj.damage = 20;
        proj.hasGravity = true;

        // Visual: Neon Arrow
        const arrowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: 0x33ff33 }));
        arrowMesh.rotation.x = Math.PI / 2;
        proj.mesh.add(arrowMesh);

        this.projectiles.push(proj);
        this.scene.add(proj.mesh);
    }

    animRun(dt) {
        const time = Date.now() * 0.01;
        if (this.leftLeg && this.rightLeg) {
            this.leftLeg.rotation.x = Math.sin(time * 1.5) * 0.6;
            this.rightLeg.rotation.x = Math.cos(time * 1.5) * 0.6;
        }
    }

    animAttack(t) {
        // Recoil
        if (t < 0.2) {
            this.gunArm.position.y -= 0.1; // Kick back/down
        } else {
            this.gunArm.position.y = THREE.MathUtils.lerp(this.gunArm.position.y, 1.2, 0.1);
        }
    }

    animDie(t) {
        // Fall over
        this.mesh.rotation.x = t * Math.PI / 2;
        this.mesh.position.y = Math.max(0.5, this.mesh.position.y - t * 0.1);

        // Bow flies off
        if (this.gunArm && t < 1.0) {
            this.gunArm.position.y += 0.05;
            this.gunArm.rotation.z += 0.2;
            this.gunArm.position.x += 0.05;
        }

        // Legs crumple
        if (this.leftLeg) this.leftLeg.rotation.x = -0.5;
        if (this.rightLeg) this.rightLeg.rotation.x = 0.5;
    }
}
