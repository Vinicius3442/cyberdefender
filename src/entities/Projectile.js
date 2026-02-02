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
        if (this.isStuck) {
            this.lifeTime -= dt;
            if (this.lifeTime <= 0) this.shouldRemove = true;
            return;
        }

        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.shouldRemove = true;
        }

        const moveStep = this.velocity.clone().multiplyScalar(dt);
        this.mesh.position.add(moveStep);

        // Floor Collision
        if (this.mesh.position.y <= 0) {
            this.mesh.position.y = 0;
            this.hitFloor = true;

            // Arrow Logic: Stick to floor
            // We detect type by geometry? Or add a property?
            // Let's assume if it's NOT explosive and NOT BFG, check if it looks like an arrow?
            // Better: Player.js sets specific flags. 
            // For now, let's look at the mesh structure or add a flag in Player.js
            // Simplest: Check if it's NOT explosive and lifetime is not instant remove.
            // Actually, I'll rely on Collision.js to handle the "Remove" logic for bullets.
            // But for sticking, we stop velocity here.

            // Hacky check for arrow: if it has children (group) it is likely the arrow or shotgun/etc.
            // But checking Children is safer for the Arrow Group we made.
            const isArrow = this.mesh.type === 'Group';

            if (isArrow && !this.isExplosive) {
                this.isStuck = true;
                this.lifeTime = 5.0; // Stay for 5 seconds
            }
        }

        // BFG Effect
        if (this.isBFG) {
            // (Handled in Collision)
        }
    }
}
