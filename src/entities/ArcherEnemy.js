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
        
        this.createArcherMesh();
    }

    createArcherMesh() {
        // Lean robot, green/brown camo?
        if (this.mesh) this.scene.remove(this.mesh);
        
        const geometry = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x556622 }); // Ranger Green
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        // Crossbow Model
        const bow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x332211 }));
        bow.position.set(0, 0.2, 0.5);
        this.mesh.add(bow);
        
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    shoot(targetPos) {
        if (!this.projectiles) return;

        // Calculate direction
        const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position).normalize();
        
        // Adjust spawn point
        const spawnPos = this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)).add(direction.multiplyScalar(1.0));

        // Create Arrow (Projectile with cosmetic change?)
        const proj = new Projectile(spawnPos, direction, false);
        proj.velocity.multiplyScalar(1.5); // Fast arrow
        proj.damage = 25;
        
        // Visual override for arrow
        // Assuming Projectile class supports it or we attach a child
        const arrowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        arrowMesh.rotation.x = Math.PI/2;
        proj.mesh.add(arrowMesh);
        
        this.projectiles.push(proj);
        this.scene.add(proj.mesh);
    }
}
