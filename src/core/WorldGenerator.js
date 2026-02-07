import * as THREE from 'three';
import { Utils } from './Utils.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.worldSize = 1500; // Reduced from 2500 for Performance
        this.spawnRadius = 250; // Keep gameplay area focused
        this.chunkSize = 10;
        this.props = [];
    }

    generateLevel() {
        this.createGround();
        this.createRuins();
        this.createCyberTrees();
        this.createFoliage(); // New Instanced Foliage
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
        
        const count = geometry.attributes.position.count;
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

        const posAttribute = geometry.attributes.position;
        const colAttribute = geometry.attributes.color;
        
        const colorLow = new THREE.Color(0x332211); // Dark scorched valley
        const colorHigh = new THREE.Color(0x8b5a2b); // Lighter dust/sand peak
        const tempColor = new THREE.Color();

        for (let i = 0; i < count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i); 
            
            // Standard Mapping
            const worldX = x;
            const worldZ = -y; 
            
            const height = this.getHeight(worldX, worldZ);
            posAttribute.setZ(i, height); // Displace "flat" plane

            // Vertex Coloring based on Height + Noise
            // Normalize height roughly between -2 and 2
            let t = (height + 2) / 4; 
            t += (Math.random() - 0.5) * 0.2; // Add noise
            t = Math.max(0, Math.min(1, t));

            tempColor.lerpColors(colorLow, colorHigh, t);
            colAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }
        
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true, // ENABLE VERTEX COLORS
            roughness: 1.0,
            metalness: 0.0
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    createFoliage() {
        // Dead Bushes using InstancedMesh (Efficient)
        const instanceCount = 1500;
        
        // Simple Geometry for Bush (2 Crossed Planes or a Tetrahedron)
        // Tetrahedron is very low poly
        const geometry = new THREE.TetrahedronGeometry(0.5, 0); 
        const material = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 1.0 });

        const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        // const color = new THREE.Color(); // Unused

        for (let i = 0; i < instanceCount; i++) {
            // Random Position
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * (this.spawnRadius * 3); // Avoid center spawn (0-20)
            
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            
            // Get Height at position
            const y = this.getHeight(x, z);

            dummy.position.set(x, y + 0.2, z);
            
            // Random Rotation
            dummy.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
            
            // Random Scale
            const s = 0.5 + Math.random() * 1.5;
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        this.scene.add(mesh);
        this.props.push(mesh);
    }

    createRuins() {
        // Scatter broken walls and pillars
        // Use InstancedMesh instead of individual Meshes
        const numRuins = 40; // Total
        const matConcrete = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
        
        // 1. Walls
        const wallGeo = new THREE.BoxGeometry(4, 3, 0.5);
        const wallMesh = new THREE.InstancedMesh(wallGeo, matConcrete, numRuins);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        // 2. Pillars
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 8);
        const pillarMesh = new THREE.InstancedMesh(pillarGeo, matConcrete, numRuins);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        let wallCount = 0;
        let pillarCount = 0;
        
        for (let i = 0; i < numRuins; i++) {
            const x = (Math.random() - 0.5) * (this.spawnRadius * 2);
            const z = (Math.random() - 0.5) * (this.spawnRadius * 2);
            
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
            
            if (Math.random() > 0.5) {
                // Wall
                dummy.position.set(x, 1.5, z);
                dummy.rotation.set(0, Math.random() * Math.PI, 0);
                dummy.scale.set(1 + Math.random(), 1 + Math.random()*0.5, 1);
                dummy.updateMatrix();
                wallMesh.setMatrixAt(wallCount++, dummy.matrix);
            } else {
                // Pillar
                dummy.position.set(x, 0.5, z);
                dummy.rotation.set(0, Math.random() * Math.PI, Math.PI / 2); // Toppled
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                pillarMesh.setMatrixAt(pillarCount++, dummy.matrix);
            }
        }
        
        // Set count
        wallMesh.count = wallCount;
        pillarMesh.count = pillarCount;
        
        this.scene.add(wallMesh);
        this.scene.add(pillarMesh);
        this.props.push(wallMesh);
        this.props.push(pillarMesh);
    }

    createCyberTrees() {
        // Trees with glowing leaves (Neon style)
        // Keep as Group for now since they are composite (Trunk + Cone)
        // Optimization: Could be 2 InstancedMeshes (Trunks + Leaves)
        
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
        
        // 1. The Core Spire (Giant Obelisk) - Single Mesh (OK)
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

        // 2. Floating Rings around Spire - Small count (3), OK as Mesh
        const ringGeo = new THREE.TorusGeometry(150, 5, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        
        for(let i=0; i<3; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(center);
            ring.position.y = 200 + i * 150;
            ring.rotation.x = Math.PI / 2;
            ring.userData = { rotSpeed: 0.2 + i * 0.1 };
            this.scene.add(ring);
            this.props.push(ring); 
        }

        // 3. Base Fortress (The City) - INSTANCED OPTIMIZATION
        const cityCount = 60; // Increased count safely due to instancing
        const blockGeo = new THREE.BoxGeometry(1,1,1);
        const blockMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
        
        const cityMesh = new THREE.InstancedMesh(blockGeo, blockMat, cityCount);
        cityMesh.castShadow = true;
        cityMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        const cityGroup = new THREE.Group(); // Only for lights
        
        for(let i=0; i<cityCount; i++) {
            const w = 20 + Math.random() * 50;
            const h = 50 + Math.random() * 200;
            const d = 20 + Math.random() * 50;
            
            const angle = Math.random() * Math.PI * 2;
            const radius = 150 + Math.random() * 300;
            
            // Set Transform
            dummy.position.set(
                center.x + Math.cos(angle) * radius,
                center.y + h / 2,
                center.z + Math.sin(angle) * radius
            );
            dummy.scale.set(w, h, d);
            dummy.rotation.set(0, angle, 0); // Face center roughly
            dummy.updateMatrix();
            
            cityMesh.setMatrixAt(i, dummy.matrix);
            
            // Minimal Lights (Optimization: Don't spawn light for every building)
            if (i % 5 === 0) { // Only 20% of buildings have lights
                const light = new THREE.PointLight(0x00ffff, 1, 300);
                light.position.set(dummy.position.x, h, dummy.position.z);
                cityGroup.add(light);
            }
        }
        
        this.scene.add(cityMesh);
        this.scene.add(cityGroup);

        // 4. Beam to Sky
        const beamGeo = new THREE.CylinderGeometry(5, 5, 5000, 32);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.copy(center);
        beam.position.y = 2500;
        this.scene.add(beam);
        
        this.props.push(beam);
        this.props.push(spire); // Track main structures too
        this.props.push(cityGroup); 
        this.props.push(cityMesh);
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
