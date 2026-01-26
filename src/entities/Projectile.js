import * as THREE from 'three';

export class Projectile {
    // Static resources
    static geometry = new THREE.SphereGeometry(0.1, 8, 8);
    static matPlayer = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    static matEnemy = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    static matBFG = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Will override geometry
    static matExplosive = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Same as enemy for now

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
        let geometry = Projectile.geometry;
        let material = isPlayerProjectile ? Projectile.matPlayer : Projectile.matEnemy;

        // We defer mesh creation if it's special, or we handle it after instantiation?
        // The Player.js sets properties AFTER creation. This is tricky.
        // Let's create a default mesh, and if Player.js changes it, we need to handle that.
        // Actually, Player.js sets properties and REPLACES geometry. That's bad.
        // Let's just use the default for now, and let Player.js do its thing but warn or fix Player.js later.
        // For now, let's just reuse the basic ones.

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
