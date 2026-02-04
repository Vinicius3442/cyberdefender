import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import * as THREE from 'three';

export class SniperEnemy extends Enemy {
    constructor(scene, position, projectiles) {
        super(scene, position);
        this.projectiles = projectiles;
        this.hp = 40;
        this.speed = 0; // Stationary mostly
        this.attackRange = 40;
        this.attackCooldown = 3.0;
        this.attackTimer = 0;
        this.lastAttackTime = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        const thinMat = new THREE.MeshStandardMaterial({ color: 0x224422 }); // Dark Camo Green

        // Long Legs
        const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2);
        const lLeg = new THREE.Mesh(legGeo, thinMat);
        lLeg.position.set(-0.2, 0.6, 0);
        group.add(lLeg);
        
        const rLeg = new THREE.Mesh(legGeo, thinMat);
        rLeg.position.set(0.2, 0.6, 0);
        group.add(rLeg);

        // Thin Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), thinMat);
        body.position.y = 1.5;
        group.add(body);

        // Head with single scope eye
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), thinMat);
        head.position.y = 1.9;
        group.add(head);

        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0x00ff00 })); // Green Scope Eye
        eye.rotation.x = Math.PI/2;
        eye.position.set(0, 1.9, 0.15);
        group.add(eye);

        // Gun Arm (Right)
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        arm.position.set(0.35, 1.5, 0.4);
        group.add(arm);

        group.scale.set(1.4, 1.4, 1.4);
        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

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
        projectile.velocity.multiplyScalar(3.0); // Very fast (60 speed)
        projectile.damage = 40;
        projectile.mesh.material.color.setHex(0xff00ff); // Purple laser

        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }
}
