import * as THREE from 'three';

export class Projectile {
    constructor(position, direction, isPlayerProjectile = true) {
        this.velocity = direction.clone().normalize().multiplyScalar(20);
        this.isPlayerProjectile = isPlayerProjectile;
        this.shouldRemove = false;
        this.damage = 10;
        this.radius = 0.1;

        // Special Types
        this.isBFG = false;
        this.isExplosive = false;
        this.explosionRadius = 0;

        // Mesh
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const color = isPlayerProjectile ? 0xffff00 : 0xff0000;
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        this.lifeTime = 2.0;
    }

    update(dt) {
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.shouldRemove = true;
        }

        const moveStep = this.velocity.clone().multiplyScalar(dt);
        this.mesh.position.add(moveStep);

        // BFG Effect: Damage everything nearby as it flies
        if (this.isBFG) {
            // This needs access to enemies list, but Projectile doesn't have it.
            // Logic must be in Collision.js or passed in.
            // We'll handle BFG area damage in Collision.js
        }
    }
}
