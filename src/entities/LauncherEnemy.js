import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class LauncherEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        
        this.hp = 80; // Medium tanky
        this.speed = 2.0; // Slow
        this.attackRange = 30;
        this.attackCooldown = 4.0; // Very slow fire
        this.attackTimer = 0;
        this.lastAttackTime = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x444488 }); // Blueish Metal

        // Track base (Legs)
        const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        trackL.position.set(-0.35, 0.1, 0); group.add(trackL);
        const trackR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        trackR.position.set(0.35, 0.1, 0); group.add(trackR);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), mat);
        torso.position.y = 0.5;
        group.add(torso);

        // Shoulder Cannons (Launchers)
        const tubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8);
        
        const leftTube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
        leftTube.rotation.x = Math.PI / 2;
        leftTube.position.set(-0.4, 0.8, -0.2);
        group.add(leftTube);

        const rightTube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
        rightTube.rotation.x = Math.PI / 2;
        rightTube.position.set(0.4, 0.8, -0.2);
        group.add(rightTube);

        group.scale.set(1.5, 1.5, 1.5);
        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Keep distance
        const dist = this.mesh.position.distanceTo(playerPosition);
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        if (dist < 10) {
            // Back away
            const direction = new THREE.Vector3()
                .subVectors(this.mesh.position, playerPosition)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        } else if (dist > 20) {
            // Move closer
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
            direction.y = 0;
            this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        }

        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.shoot(playerPosition);
            this.attackTimer = this.attackCooldown;
        }
    }

    shoot(targetPos) {
        const direction = new THREE.Vector3()
            .subVectors(targetPos, this.mesh.position)
            .normalize();

        const spawnPos = this.mesh.position.clone().add(direction.clone().multiplyScalar(1.5));
        spawnPos.y += 0.5;

        const projectile = new Projectile(spawnPos, direction, false);
        projectile.isExplosive = true;
        projectile.explosionRadius = 3.0;
        projectile.damage = 30;
        projectile.mesh.scale.set(2, 2, 2); // Big rocket

        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
