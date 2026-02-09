import * as THREE from 'three';

export class Projectile {
    // Static resources
    static geometry = new THREE.SphereGeometry(0.1, 8, 8);
    static matPlayer = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    static matEnemy = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    static matBFG = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Will override geometry
    static matExplosive = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Same as enemy for now

    constructor(position, direction, isPlayerProjectile = true) {
        this.velocity = direction.clone().multiplyScalar(isPlayerProjectile ? 50 : 20);
        this.isPlayerProjectile = isPlayerProjectile;
        this.hasGravity = false; // Default false
        this.shouldRemove = false;
        this.damage = 10;
        this.radius = 0.1;

        // Special Types (Default False)
        this.isBFG = false;
        this.isExplosive = false;
        this.explosionRadius = 0;
        this.isPlasma = false;
        this.spinRate = new THREE.Vector3();

        // Mesh Generation (Default)
        let geometry = Projectile.geometry;
        let material = isPlayerProjectile ? Projectile.matPlayer : Projectile.matEnemy;

        // This mesh might be replaced by specialized logic in Player.js or overwritten here if we detect type in future refactor.
        // Currently Player.js overrides this for BFG/Launcher. 
        // We will enhance the DEFAULT mesh to be a glowing tracer for standard bullets.

        if (!this.mesh) {
            // Hitbox Fix: Use Sphere (Ball) for everything except special types
            // User Request: "bolinhas pequenas"
            if (!this.isBFG && !this.isExplosive) {
                const ballGeo = new THREE.SphereGeometry(0.2, 8, 8); // Slightly bigger for better hit
                material = new THREE.MeshBasicMaterial({
                    color: isPlayerProjectile ? 0xffff00 : 0xff0000,
                    toneMapped: false // Glow effect 
                });
                // Add simple glow (PointLight) if expensive? No, just emissive material looks good if we used Standard.
                // Basic material is self-illuminated.
                this.mesh = new THREE.Mesh(ballGeo, material);
            } else {
                this.mesh = new THREE.Mesh(geometry, material);
            }
        }

        this.mesh.position.copy(position);
        this.lifeTime = 2.0;
    }

    // Static Helpers for Personality Models (Called by Player.js)
    static createMissile() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        body.rotation.x = Math.PI / 2;
        group.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        nose.rotation.x = Math.PI / 2;
        nose.position.z = 0.25;
        group.add(nose);
        // Fins
        const finGeo = new THREE.BoxGeometry(0.2, 0.2, 0.01);
        const fins = new THREE.Mesh(finGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }));
        fins.position.z = -0.15;
        group.add(fins);
        const fins2 = fins.clone();
        fins2.rotation.z = Math.PI / 2;
        group.add(fins2);
        return group;
    }

    static createPlasma() {
        const geo = new THREE.SphereGeometry(0.3, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        // Inner core
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        mesh.add(core);
        return mesh;
    }

    update(dt) {
        if (this.isStuck) {
            this.lifeTime -= dt;
            if (this.lifeTime <= 0) this.shouldRemove = true;
            return;
        }

        this.lifeTime -= dt;
        if (this.lifeTime <= 0) this.shouldRemove = true;

        if (this.hasGravity) {
            this.velocity.y -= 15.0 * dt; // Gravity

            // Optimization: LookAt without alloc needs a target pos. 
            // We can reuse a scratch vector if we had one, but Projectile doesn't have a temp vec.
            // For now, let's keep the clone for lookAt or skip it? 
            // Optimization: Just calculate target
            const target = this.mesh.position.clone().add(this.velocity);
            this.mesh.lookAt(target);
            // Note: lookAt(vector) internally does vector math.
            // Ideally we pass (x, y, z) to avoid object if lookAt supports it? Three.js lookAt takes Vector3 or x,y,z.
            // We can do this.mesh.lookAt(this.mesh.position.x + this.velocity.x, ...);
        }

        // Optimization: Zero GC movement
        this.mesh.position.addScaledVector(this.velocity, dt);

        // Floor Collision
        // Use provided floor height or default to 0
        const floorHeight = (arguments.length > 1 && typeof arguments[1] === 'number') ? arguments[1] : 0;

        if (this.mesh.position.y <= floorHeight) {
            this.mesh.position.y = floorHeight;
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
            // Pulse
            const scale = 1.0 + Math.sin(this.lifeTime * 10) * 0.2;
            this.mesh.scale.set(scale, scale, scale);
            this.mesh.rotation.z += 5 * dt;
        }

        // Spin (if any)
        if (this.spinRate) {
            this.mesh.rotation.x += this.spinRate.x * dt;
            this.mesh.rotation.y += this.spinRate.y * dt;
            this.mesh.rotation.z += this.spinRate.z * dt;
        }
    }
}
