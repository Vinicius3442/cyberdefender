import * as THREE from 'three';
import { Utils } from './Utils.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.worldSize = 2500; // Expanded for Horizon
        this.spawnRadius = 250; // Keep gameplay area focused
        this.chunkSize = 10;
        this.props = [];
    }

    generateLevel() {
        this.createGround();
        this.createRuins();
        this.createCyberTrees();
        this.spawnTechCastle();
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
        // High segment count for large world to maintain terrain detail
        const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 256, 256);
        
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
            color: 0x8b5a2b, // Scorched Earth/Sand
            roughness: 1.0,
            metalness: 0.0,
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
            const x = (Math.random() - 0.5) * (this.spawnRadius * 2);
            const z = (Math.random() - 0.5) * (this.spawnRadius * 2);
            
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
        const matTrunk = new THREE.MeshStandardMaterial({ color: 0x443322 }); // Dry Wood
        const matLeaves = new THREE.MeshStandardMaterial({ 
            color: 0xaa8844, // Dead leaves
            emissive: 0x000000, 
            emissiveIntensity: 0.0,
            transparent: false,
            opacity: 1.0
        });

        for (let i = 0; i < numTrees; i++) {
            const x = (Math.random() - 0.5) * (this.spawnRadius * 2);
            const z = (Math.random() - 0.5) * (this.spawnRadius * 2);
            
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

    spawnTechCastle() {
        const center = new THREE.Vector3(0, 0, -2000);
        
        // 1. The Core Spire (Giant Obelisk)
        const spireHeight = 800;
        const spireGeo = new THREE.CylinderGeometry(20, 100, spireHeight, 6);
        const spireMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, 
            roughness: 0.2, 
            metalness: 0.9,
            emissive: 0x00ffff,
            emissiveIntensity: 0.2
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.copy(center);
        spire.position.y = spireHeight / 2 - 50; 
        this.scene.add(spire);

        // 2. Floating Rings around Spire
        const ringGeo = new THREE.TorusGeometry(150, 5, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        
        for(let i=0; i<3; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(center);
            ring.position.y = 200 + i * 150;
            ring.rotation.x = Math.PI / 2;
            ring.userData = { rotSpeed: 0.2 + i * 0.1 };
            this.scene.add(ring);
            this.props.push(ring); // Add to props so we might animate them later? Or manual update?
            // Since WorldGenerator doesn't update, we might need a controller.
            // For now, static or user shader.
        }

        // 3. Base Fortress (The City)
        const cityGroup = new THREE.Group();
        cityGroup.position.copy(center);
        
        const blockGeo = new THREE.BoxGeometry(1,1,1);
        const blockMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

        for(let i=0; i<50; i++) {
            const w = 20 + Math.random() * 50;
            const h = 50 + Math.random() * 200;
            const d = 20 + Math.random() * 50;
            
            const building = new THREE.Mesh(blockGeo, blockMat);
            building.scale.set(w, h, d);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 300;
            
            building.position.set(
                Math.cos(angle) * radius,
                h / 2,
                Math.sin(angle) * radius
            );
            
            // Add some lights
            if (Math.random() > 0.7) {
                const light = new THREE.PointLight(0x00ffff, 1, 300);
                light.position.set(building.position.x, h, building.position.z);
                cityGroup.add(light);
            }
            
            cityGroup.add(building);
        }
        this.scene.add(cityGroup);

        // 4. Beam to Sky
        const beamGeo = new THREE.CylinderGeometry(5, 5, 5000, 32);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.copy(center);
        beam.position.y = 2500;
        this.scene.add(beam);
        this.scene.add(beam);
        this.props.push(beam);
        this.props.push(spire); // Track main structures too
        this.props.push(cityGroup); // Track city
    }

    clear() {
        // Remove all tracked props
        this.props.forEach(prop => {
            if (prop.parent) prop.parent.remove(prop);
        });
        this.props = [];

        // Remove Ground
        if (this.ground) {
            this.scene.remove(this.ground);
            this.ground.geometry.dispose();
            this.ground.material.dispose();
            this.ground = null;
        }

        // Remove Tech Castle specific references if any were not in props?
        // (Modified spawnTechCastle to push to props above)
    }
}
