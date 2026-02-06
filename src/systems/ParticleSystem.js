import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Cache
        this.sphereGeom = new THREE.SphereGeometry(0.5, 16, 16);
        this.boxGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.ringGeom = new THREE.RingGeometry(1.5, 2.0, 32, 1, Math.PI / 4, Math.PI / 2);

        this.matExplosion = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1.0
        });
        this.matDebris = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        this.matSlash = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
    }

    createExplosion(position, color = 0xffaa00, count = 20, scale = 1.0) {
        // 1. Expanding Sphere
        const mat = this.matExplosion.clone();
        mat.color.setHex(color);

        const sphere = new THREE.Mesh(this.sphereGeom, mat);
        sphere.position.copy(position);
        sphere.scale.setScalar(scale); // Apply base scale
        this.scene.add(sphere);

        this.particles.push({
            mesh: sphere,
            type: 'explosion_sphere',
            life: 0.5,
            maxLife: 0.5,
            scaleSpeed: 10.0 * scale, // Scale speed relative to size
            baseScale: scale
        });

        // 2. Debris Particles
        // Reusing material for debris is fine if they don't fade individually or change color
        // But we might want different colors.
        const debrisMat = this.matDebris.clone();
        debrisMat.color.setHex(color);

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.boxGeom, debrisMat);
            mesh.position.copy(position);
            mesh.scale.setScalar(scale); // Scale debris chunks

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10 * scale,
                (Math.random() - 0.5) * 10 * scale + (5 * scale), // Upward bias
                (Math.random() - 0.5) * 10 * scale
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                type: 'debris',
                velocity: velocity,
                life: 1.0,
                maxLife: 1.0
            });
        }
    }

    createSlash(position, quaternion) {
        // Create a curved plane or just a simple plane for the slash
        // We'll use a RingGeometry segment to look like a swipe
        const geometry = new THREE.RingGeometry(1.5, 2.0, 32, 1, Math.PI / 4, Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.quaternion.copy(quaternion);

        // Orient correctly (Ring is in XY plane)
        // We want it to look like a horizontal or diagonal slash
        mesh.rotateX(Math.PI / 2);

        this.scene.add(mesh);

        this.particles.push({
            mesh: mesh,
            type: 'slash',
            life: 0.2,
            maxLife: 0.2
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                // Dispose material if it was cloned
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'explosion_sphere') {
                const scale = 1 + (p.maxLife - p.life) * p.scaleSpeed;
                p.mesh.scale.set(scale, scale, scale);
                p.mesh.material.opacity = p.life / p.maxLife;
            } else if (p.type === 'debris') {
                p.velocity.y -= 20 * dt; // Gravity
                p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
                p.mesh.rotation.x += 2 * dt;
                p.mesh.rotation.z += 2 * dt;
            } else if (p.type === 'slash') {
                p.mesh.material.opacity = p.life / p.maxLife;
                p.mesh.rotation.z -= 5 * dt; // Rotate the slash slightly
            }
        }
    }
}
