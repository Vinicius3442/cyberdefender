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
        this.sphereGeom = new THREE.SphereGeometry(0.5, 8, 8);
        this.boxGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        this.ringGeom = new THREE.RingGeometry(1.5, 2.0, 16, 1, Math.PI / 4, Math.PI / 2);

        // Pre-create shared materials by color/type to avoid runtime clones & WebGL shader compilation lag
        this.materialCache = {};
    }

    _getMaterial(type, colorHex = 0xffaa00) {
        const key = `${type}_${colorHex.toString(16)}`;
        if (!this.materialCache[key]) {
            if (type === 'explosion_sphere') {
                this.materialCache[key] = new THREE.MeshBasicMaterial({
                    color: colorHex,
                    transparent: true,
                    opacity: 1.0,
                    depthWrite: false
                });
            } else if (type === 'debris') {
                this.materialCache[key] = new THREE.MeshStandardMaterial({
                    color: colorHex,
                    roughness: 0.4,
                    metalness: 0.8
                });
            } else if (type === 'slash') {
                this.materialCache[key] = new THREE.MeshBasicMaterial({
                    color: colorHex,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                });
            }
        }
        return this.materialCache[key];
    }

    getFromPool(type, colorHex = 0xffaa00) {
        const mat = this._getMaterial(type, colorHex);
        
        if (this.pool[type] && this.pool[type].length > 0) {
            const p = this.pool[type].pop();
            p.mesh.material = mat;
            p.mesh.visible = true;
            return p;
        }
        
        // Create new if pool empty
        let mesh;
        if (type === 'explosion_sphere') {
            mesh = new THREE.Mesh(this.sphereGeom, mat);
        } else if (type === 'debris') {
            mesh = new THREE.Mesh(this.boxGeom, mat);
        } else if (type === 'slash') {
            mesh = new THREE.Mesh(this.ringGeom, mat);
        }
        
        this.scene.add(mesh);
        return { mesh: mesh, type: type };
    }

    returnToPool(p) {
        p.mesh.visible = false;
        if (this.pool[p.type]) {
            this.pool[p.type].push(p);
        } else {
            this.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
        }
    }

    createExplosion(position, color = 0xffaa00, count = 12, scale = 1.0) {
        // 1. Expanding Sphere
        const p = this.getFromPool('explosion_sphere', color);
        p.mesh.position.copy(position);
        p.mesh.scale.setScalar(scale);
        p.mesh.material.opacity = 1.0;
        
        p.life = 0.4;
        p.maxLife = 0.4;
        p.scaleSpeed = 12.0 * scale;
        p.baseScale = scale;
        
        this.particles.push(p);

        // 2. Debris Particles
        for (let i = 0; i < count; i++) {
            const d = this.getFromPool('debris', color);
            d.mesh.position.copy(position);
            d.mesh.scale.setScalar(scale * (0.8 + Math.random() * 0.4));
            d.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

            // Random velocity with upward explosion burst
            d.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 14 * scale,
                (Math.random() - 0.2) * 12 * scale + (4 * scale),
                (Math.random() - 0.5) * 14 * scale
            );
            d.life = 0.8 + Math.random() * 0.4;
            d.maxLife = d.life;
            
            this.particles.push(d);
        }
    }

    createSlash(position, quaternion) {
        const p = this.getFromPool('slash', 0x00ffff);
        p.mesh.position.copy(position);
        p.mesh.quaternion.copy(quaternion);
        p.mesh.rotateX(Math.PI / 2);
        p.mesh.material.opacity = 0.9;
        
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
                if (p.mesh.material.transparent) {
                    p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
                }
            } else if (p.type === 'debris') {
                p.velocity.y -= 25 * dt; // Gravity
                p.mesh.position.addScaledVector(p.velocity, dt);
                p.mesh.rotation.x += 4 * dt;
                p.mesh.rotation.z += 4 * dt;
            } else if (p.type === 'slash') {
                if (p.mesh.material.transparent) {
                    p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);
                }
                p.mesh.rotation.z -= 6 * dt; 
            }
        }
    }
}
