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
        // High-Tech Cyber Wavelength Ground
        const geometry = new THREE.PlaneGeometry(this.worldSize, this.worldSize, 256, 256);
        
        const count = geometry.attributes.position.count;
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

        const posAttribute = geometry.attributes.position;
        const colAttribute = geometry.attributes.color;
        
        const colorLow = new THREE.Color(0x0d111a);  // Deep obsidian blue valley
        const colorMid = new THREE.Color(0x2a1b3d);  // Cyber violet transition
        const colorHigh = new THREE.Color(0x442255); // Scorched neon peak
        const gridGlow = new THREE.Color(0x00ffcc);  // Glowing energy vein
        const tempColor = new THREE.Color();

        for (let i = 0; i < count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i); 
            
            const worldX = x;
            const worldZ = -y; 
            
            const height = this.getHeight(worldX, worldZ);
            posAttribute.setZ(i, height);

            // Vertex Coloring based on Height + Synthwave Grid Veins
            let t = (height + 2) / 4; 
            t = Math.max(0, Math.min(1, t));

            if (t < 0.5) {
                tempColor.lerpColors(colorLow, colorMid, t * 2);
            } else {
                tempColor.lerpColors(colorMid, colorHigh, (t - 0.5) * 2);
            }

            // Energy veins along grid interval
            if (Math.abs(Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05)) > 0.95) {
                tempColor.lerp(gridGlow, 0.4);
            }

            colAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }
        
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.7,
            metalness: 0.3
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    createFoliage() {
        // Neon Crystal Foliage using InstancedMesh
        const instanceCount = 1500;
        
        const geometry = new THREE.TetrahedronGeometry(0.6, 0); 
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00e5ff, 
            emissive: 0x005577, 
            emissiveIntensity: 0.6,
            roughness: 0.2, 
            metalness: 0.9 
        });

        const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const dummy = new THREE.Object3D();

        for (let i = 0; i < instanceCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 20 + Math.random() * (this.spawnRadius * 3);
            
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = this.getHeight(x, z);

            dummy.position.set(x, y + 0.3, z);
            dummy.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5);
            
            const s = 0.6 + Math.random() * 1.4;
            dummy.scale.set(s, s * 1.5, s);

            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }

        this.scene.add(mesh);
        this.props.push(mesh);
    }

    createRuins() {
        // Scatter cyber obelisks and glowing pillars
        const numRuins = 50;
        const matConcrete = new THREE.MeshStandardMaterial({ color: 0x1c202a, roughness: 0.4, metalness: 0.7 });
        const matNeonStrip = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        
        // 1. Walls
        const wallGeo = new THREE.BoxGeometry(4, 3.5, 0.6);
        const wallMesh = new THREE.InstancedMesh(wallGeo, matConcrete, numRuins);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        
        // 2. Pillars
        const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 7, 8);
        const pillarMesh = new THREE.InstancedMesh(pillarGeo, matConcrete, numRuins);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        
        const dummy = new THREE.Object3D();
        let wallCount = 0;
        let pillarCount = 0;
        
        for (let i = 0; i < numRuins; i++) {
            const x = (Math.random() - 0.5) * (this.spawnRadius * 2);
            const z = (Math.random() - 0.5) * (this.spawnRadius * 2);
            
            if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
            
            if (Math.random() > 0.4) {
                dummy.position.set(x, 1.75, z);
                dummy.rotation.set(0, Math.random() * Math.PI, 0);
                dummy.scale.set(1 + Math.random(), 1 + Math.random()*0.5, 1);
                dummy.updateMatrix();
                wallMesh.setMatrixAt(wallCount++, dummy.matrix);
            } else {
                dummy.position.set(x, 0.5, z);
                dummy.rotation.set(0, Math.random() * Math.PI, Math.PI / 2);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                pillarMesh.setMatrixAt(pillarCount++, dummy.matrix);
            }
        }
        
        wallMesh.count = wallCount;
        pillarMesh.count = pillarCount;
        
        this.scene.add(wallMesh);
        this.scene.add(pillarMesh);
        this.props.push(wallMesh);
        this.props.push(pillarMesh);
    }

    createCyberTrees() {
        const numTrees = 25;
        const matTrunk = new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.8, roughness: 0.3 });
        const matLeaves = new THREE.MeshStandardMaterial({ 
            color: 0x00ffaa, 
            emissive: 0x008855, 
            emissiveIntensity: 0.7,
            roughness: 0.2,
            metalness: 0.5
        });

        for (let i = 0; i < numTrees; i++) {
            const x = (Math.random() - 0.5) * (this.spawnRadius * 2);
            const z = (Math.random() - 0.5) * (this.spawnRadius * 2);
            
            if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

            const group = new THREE.Group();
            
            // Trunk
            const height = 5 + Math.random() * 4;
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.7, height, 8), matTrunk);
            trunk.position.y = height / 2;
            trunk.castShadow = true;
            group.add(trunk);

            // Leaves (Cones)
            const foliage = new THREE.Mesh(new THREE.ConeGeometry(2.8, 5, 8), matLeaves);
            foliage.position.y = height + 1.5;
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
