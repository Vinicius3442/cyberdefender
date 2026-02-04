import * as THREE from 'three';
import { Utils } from './Utils.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.worldSize = 200; // 200x200 meters
        this.chunkSize = 10;
        this.props = [];
    }

    generateLevel() {
        this.createGround();
        this.createRuins();
        this.createCyberTrees();
    }

    spawnBossArena(center) {
        // Clear props near center
        // (Optional optimization: remove props)

        // Create Lava Ring
        const ringGeo = new THREE.TorusGeometry(60, 2, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(center);
        ring.position.y = 0.5;
        this.scene.add(ring);
        
        // Add Warning Light
        const light = new THREE.PointLight(0xff0000, 2, 80);
        light.position.set(center.x, 20, center.z);
        this.scene.add(light);
    }

    getHeight(x, z) {
        // Deterministic Noise Function
        // Combine sine waves for localized hills/valleys
        const h1 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
        const h2 = Math.sin(x * 0.3 + 100) * Math.cos(z * 0.3 + 100) * 0.5;
        // Add a "crater" or "flat valley" logic?
        // For now, simple wave sum
        return h1 + h2;
    }

    createGround() {
        // Post-Apocalyptic Ground (Charred/Dark)
        const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 64, 64);
        
        // Displace vertices for uneven terrain
        const posAttribute = geometry.attributes.position;
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i); // This is actually local coordinate relative to plane center
            // PlaneGeometry is created on XY plane. We rotate it later?
            // Wait, standard PlaneGeometry is X, Y. 
            // When we rotate X -90, Y becomes -Z.
            // So logic:
            // Local X -> World X
            // Local Y -> World -Z (since we rotate -PI/2)
            
            // Actually simpler:
            // Just apply height to Z (which becomes Y after rotation? No.)
            // PlaneGeometry: vertices are (x, y, 0).
            // Rotation -90 deg X: (x, 0, -y) or (x, z, y)?
            // Visual: Flat on ground. Normal pointing up (Y).
            // Z attribute becomes Y height? No.
            
            // Let's stick to standard Three.js approach:
            // Plane lying on XZ plane? No, Plane is XY default.
            // We rotate it. So Local Z becomes World -Y? Or World Z?
            
            // Let's just use a helper or assume standard mapping:
            // After rotation x=-PI/2:
            // Local X -> World X
            // Local Y -> World -Z
            // Local Z -> World Y (Height)
            
            const worldX = x;
            const worldZ = -y; 
            
            const height = this.getHeight(worldX, worldZ);
            posAttribute.setZ(i, height); // Displace "flat" plane
        }
        
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, // Dark Grey
            roughness: 0.9,
            metalness: 0.2,
            vertexColors: false
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    createRuins() {
        // Scatter broken walls and pillars
        const numRuins = 30;
        const matConcrete = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });

        for (let i = 0; i < numRuins; i++) {
            const x = (Math.random() - 0.5) * (this.worldSize - 20);
            const z = (Math.random() - 0.5) * (this.worldSize - 20);
            
            // Don't spawn on spawn point
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

            // Random Ruin Type
            if (Math.random() > 0.5) {
                // Wall Section
                const width = 2 + Math.random() * 4;
                const height = 2 + Math.random() * 3;
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.5), matConcrete);
                mesh.position.set(x, height / 2, z);
                mesh.rotation.y = Math.random() * Math.PI;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.props.push(mesh);
            } else {
                // Toppled Pillar
                const height = 4 + Math.random() * 4;
                const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, height, 8), matConcrete);
                mesh.position.set(x, 0.5, z);
                // Tip it over
                mesh.rotation.z = Math.PI / 2;
                mesh.rotation.y = Math.random() * Math.PI;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.props.push(mesh);
            }
        }
    }

    createCyberTrees() {
        // Trees with glowing leaves (Neon style)
        const numTrees = 20;
        const matTrunk = new THREE.MeshStandardMaterial({ color: 0x221100 });
        const matLeaves = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, 
            emissive: 0x00aa00, 
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < numTrees; i++) {
            const x = (Math.random() - 0.5) * (this.worldSize - 20);
            const z = (Math.random() - 0.5) * (this.worldSize - 20);
            
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

            const group = new THREE.Group();
            
            // Trunk
            const height = 4 + Math.random() * 3;
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, height, 6), matTrunk);
            trunk.position.y = height / 2;
            trunk.castShadow = true;
            group.add(trunk);

            // Leaves (Cones)
            const foliage = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4, 8), matLeaves);
            foliage.position.y = height + 1;
            foliage.castShadow = true;
            group.add(foliage);

            const h = this.getHeight(x, z);
            group.position.set(x, h, z);
            this.scene.add(group);
            this.props.push(group);
        }
    }
}
