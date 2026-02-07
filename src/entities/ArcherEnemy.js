import * as THREE from 'three';
import { RangedEnemy } from './RangedEnemy.js';
import { Projectile } from './Projectile.js';

export class ArcherEnemy extends RangedEnemy {
    constructor(scene, position, projectiles) {
        super(scene, position, projectiles);
        
        this.hp = 60; // Glass cannon
        this.speed = 4.0;
        this.scoreValue = 120;
        this.attackRange = 40; // Long range
        this.fireRate = 2.0; // Slow but deadly
    }

    _createMesh() {
        const group = new THREE.Group();

        // Camo Armor
        const matCamo = new THREE.MeshStandardMaterial({ color: 0x334422, roughness: 0.8 });
        
        // Legs (Crouched stance?)
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.3), matCamo);
        leg.position.set(-0.2, 0.4, 0);
        group.add(leg.clone().translateX(0.4));
        group.add(leg);

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), matCamo);
        body.position.y = 1.0;
        group.add(body);

        // Head (Hooded)
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4), matCamo);
        head.position.y = 1.6;
        head.rotation.y = Math.PI/4; // Diamond shape
        group.add(head);
        this.headMesh = head;

        // Glowing Eye (Sniper lens)
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        eye.rotation.x = Math.PI/2;
        eye.position.set(0, 1.55, 0.2);
        group.add(eye);

        // Crossbow (Large)
        const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 4, 8, Math.PI), new THREE.MeshStandardMaterial({ color: 0x555555 }));
        bowCurve.rotation.x = Math.PI/2;
        bowCurve.rotation.z = Math.PI; // Face forward
        
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), new THREE.MeshStandardMaterial({ color: 0x332211 }));
        
        // Assemble Bow
        const weapon = new THREE.Group();
        weapon.add(stock);
        bowCurve.position.z = 0.5;
        weapon.add(bowCurve);
        
        weapon.position.set(0, 1.2, 0.5);
        group.add(weapon);
        this.gunArm = weapon;
        
        // Define other missing props to be safe
        this.chassisMesh = body;
        this.eyeMesh = eye;
        
        return group;
    }

    shoot(targetPos) {
        if (!this.projectiles) return;

        // Calculate direction with Arc?
        // Simple: Aim slightly up
        const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
        direction.y += 0.2; // Arc up
        direction.normalize();
        
        // Adjust spawn point
        const spawnPos = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)).add(direction.multiplyScalar(1.0));

        // Create Arrow
        const proj = new Projectile(spawnPos, direction, false);
        proj.velocity.multiplyScalar(1.2); 
        proj.damage = 20;
        proj.hasGravity = true; // NEW: Gravity enabled for curve
        
        // Visual
        const arrowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        arrowMesh.rotation.x = Math.PI/2;
        proj.mesh.add(arrowMesh);
        
        this.projectiles.push(proj);
        this.scene.add(proj.mesh);
    }

    update(dt, playerPos) {
        super.update(dt, playerPos);
        this.updateGroundPosition();
        
        // Face player always (strafe logic is in RangedEnemy)
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
    }
}
