import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.pool = {
            'explosion_sphere': [],
            'debris': [],
            'slash': []
        };

        // Static Resources (Geometry/Material Cache)
        this.sphereGeom = new THREE.SphereGeometry(0.5, 8, 8); // Reduced segments for perf
        this.boxGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.ringGeom = new THREE.RingGeometry(1.5, 2.0, 16, 1, Math.PI / 4, Math.PI / 2); // Reduced segments

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

    getFromPool(type) {
        if (this.pool[type] && this.pool[type].length > 0) {
            const p = this.pool[type].pop();
            p.mesh.visible = true;
            return p;
        }
        
        // Create new if pool empty
        let mesh;
        if (type === 'explosion_sphere') {
            mesh = new THREE.Mesh(this.sphereGeom, this.matExplosion.clone());
        } else if (type === 'debris') {
            mesh = new THREE.Mesh(this.boxGeom, this.matDebris.clone()); // Clone to allow color change if needed? default sharing ok for now
        } else if (type === 'slash') {
            mesh = new THREE.Mesh(this.ringGeom, this.matSlash.clone());
        }
        
        this.scene.add(mesh);
        return { mesh: mesh, type: type };
    }

    returnToPool(p) {
        p.mesh.visible = false;
        // Reset transform checks if needed, but usually overwritten on spawn
        if (this.pool[p.type]) {
            this.pool[p.type].push(p);
        } else {
            // Unknown type? dispose
            this.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
        }
    }

    createExplosion(position, color = 0xffaa00, count = 10, scale = 1.0) { // Reduced default count 20->10
        // 1. Expanding Sphere
        const p = this.getFromPool('explosion_sphere');
        p.mesh.position.copy(position);
        p.mesh.scale.setScalar(scale);
        p.mesh.material.color.setHex(color);
        p.mesh.material.opacity = 1.0;
        
        p.life = 0.5;
        p.maxLife = 0.5;
        p.scaleSpeed = 10.0 * scale;
        p.baseScale = scale;
        
        this.particles.push(p);

        // 2. Debris Particles
        for (let i = 0; i < count; i++) {
            const d = this.getFromPool('debris');
            d.mesh.position.copy(position);
            d.mesh.scale.setScalar(scale);
            d.mesh.material.color.setHex(color);
            d.mesh.rotation.set(0,0,0);

            // Random velocity
            d.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10 * scale,
                (Math.random() - 0.5) * 10 * scale + (5 * scale),
                (Math.random() - 0.5) * 10 * scale
            );
            d.life = 1.0;
            d.maxLife = 1.0;
            
            this.particles.push(d);
        }
    }

    createSlash(position, quaternion) {
        const p = this.getFromPool('slash');
        p.mesh.position.copy(position);
        p.mesh.quaternion.copy(quaternion);
        p.mesh.rotateX(Math.PI / 2);
        p.mesh.material.opacity = 0.8;
        
        p.life = 0.2;
        p.maxLife = 0.2;
        
        this.particles.push(p);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.returnToPool(p);
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'explosion_sphere') {
                const scale = 1 + (p.maxLife - p.life) * p.scaleSpeed;
                p.mesh.scale.set(scale, scale, scale);
                p.mesh.material.opacity = p.life / p.maxLife;
            } else if (p.type === 'debris') {
                p.velocity.y -= 20 * dt; // Gravity
                p.mesh.position.addScaledVector(p.velocity, dt);
                p.mesh.rotation.x += 2 * dt;
                p.mesh.rotation.z += 2 * dt;
            } else if (p.type === 'slash') {
                p.mesh.material.opacity = p.life / p.maxLife;
                p.mesh.rotation.z -= 5 * dt; 
            }
        }
    }
}
