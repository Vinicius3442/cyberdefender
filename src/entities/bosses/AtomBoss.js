import * as THREE from 'three';
import { Boss } from './Boss.js';
import { Projectile } from '../Projectile.js';

export class AtomBoss extends Boss {
    constructor(scene, player, position) {
        super(scene, player, 'NUCLEUS', position);
        this.name = "THE NUCLEUS";
        this.maxHp = 8000;
        this.hp = this.maxHp;
        this.speed = 3.0;
        
        this.electrons = [];
        this.orbitSpeed = 2.0;
        this.orbitTime = 0;
        
        this.attackCooldown = 2.0;
        this.state = 'IDLE';

        this._createModel();
    }

    _createModel() {
        if (this.mesh) this.scene.remove(this.mesh);
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position || new THREE.Vector3(0, 15, 0));

        // 1. Nucleus (Mechanical Eye Core)
        const nucleusGroup = new THREE.Group();
        
        // Main Core (Black Metal)
        const coreGeo = new THREE.IcosahedronGeometry(2.0, 1);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.9 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        nucleusGroup.add(coreMesh);

        // Cylindrical "Face" / Eye Socket
        const socketGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32);
        const socketMesh = new THREE.Mesh(socketGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        socketMesh.rotation.x = Math.PI / 2;
        socketMesh.position.z = 1.8; // Protrude forward
        nucleusGroup.add(socketMesh);

        // Glowing Red Eye
        const eyeGeo = new THREE.SphereGeometry(0.8, 32, 32);
        const eyeMat = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000, 
            emissiveIntensity: 2.0 
        });
        const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
        eyeMesh.position.z = 2.0;
        nucleusGroup.add(eyeMesh);

        // Rotating Rings (Gimbal)
        const ringGeo = new THREE.TorusGeometry(3.0, 0.1, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
        
        this.ring1 = new THREE.Mesh(ringGeo, ringMat);
        this.ring2 = new THREE.Mesh(ringGeo, ringMat);
        this.ring2.rotation.x = Math.PI / 2;
        
        nucleusGroup.add(this.ring2);

        // Energy Spikes (Pistons)
        for(let i=0; i<8; i++) {
            const spikeGeo = new THREE.ConeGeometry(0.2, 2.5, 8);
            const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 1.0 });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            
            // Distribute around sphere
            const phi = Math.acos( -1 + ( 2 * i ) / 8 );
            const theta = Math.sqrt( 8 * Math.PI ) * phi;
            
            spike.position.setFromSphericalCoords(1.8, phi, theta);
            spike.lookAt(0,0,0);
            nucleusGroup.add(spike);
        }

        this.mesh.add(nucleusGroup);
        this.nucleus = nucleusGroup;

        // 2. Electrons
        const electronGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const electronMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        for (let i = 0; i < 4; i++) {
            const electron = new THREE.Mesh(electronGeo, electronMat);
            // Trail?
            this.mesh.add(electron);
            this.electrons.push({
                mesh: electron,
                offset: i * (Math.PI / 2), // Phase shift
                axis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                radius: 6 + Math.random() * 2
            });
        }

        this.scene.add(this.mesh);
        
        // Mock collider
        this.collider = new THREE.Box3();
    }

    update(dt, playerPos) {
        if (this.isDying) return; // Skip logic during death anim
        if (this.hp <= 0) return;

        // Hover movement
        const dist = this.mesh.position.distanceTo(playerPos);
        const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
        this.mesh.lookAt(playerPos);

        // Animate Rings
        if (this.ring1) this.ring1.rotation.y += dt * 1.5;
        if (this.ring2) this.ring2.rotation.x += dt * 1.5;

        // Orbit Electrons
        this.orbitTime += dt * this.orbitSpeed;
        
        // Pulse Nucleus (Subtle breathing)
        const scale = 1 + Math.sin(this.orbitTime * 2) * 0.05;
        this.nucleus.scale.setScalar(scale);

        this.electrons.forEach(elec => {
            const angle = this.orbitTime + elec.offset;
            const x = Math.cos(angle) * elec.radius;
            const z = Math.sin(angle) * elec.radius;
            const vec = new THREE.Vector3(x, 0, z);
            // Apply axis rotation manually if needed, or just keep simple chaotic
            elec.mesh.position.set(x, Math.sin(angle*3)*3, z); 
        });

        // AI Logic
        if (dist > 25) {
            this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
        }

        this.attackCooldown -= dt;
        if (this.attackCooldown <= 0) {
            this.pickAttack(dir, dist);
            this.attackCooldown = 3.5; // Slightly longer cooldown between complex attacks
        }

        // Beam Logic Update (if active)
        if (this.isBeaming) {
            this.updateBeam(dt, playerPos);
        }

        this.updateBossUI();
    }

    pickAttack(dir, dist) {
        const rand = Math.random();
        if (rand < 0.3) {
            this.attackElectron(dir);
        } else if (rand < 0.5 && dist < 35) {
            this.radiationPulse();
        } else if (rand < 0.7) {
            this.beamSweep();
        } else {
            this.gravityWell();
        }
    }

    gravityWell() {
        // Pull player logic
        const pullDuration = 3.0;
        let elapsed = 0;
        
        // Visual
        const well = new THREE.Mesh(
            new THREE.SphereGeometry(2, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.5 })
        );
        well.position.copy(this.mesh.position);
        this.scene.add(well);

        const interval = setInterval(() => {
            elapsed += 0.05;
            
            // Visual Update
            well.rotation.y += 0.2;
            well.scale.setScalar(1 + Math.sin(elapsed * 10) * 0.5);
            well.position.copy(this.mesh.position); // Follow boss

            // Physics Update (Pull)
            const dirToBoss = new THREE.Vector3().subVectors(this.mesh.position, this.player.position).normalize();
            const dist = this.player.position.distanceTo(this.mesh.position);
            
            if (dist > 5) {
                // Strength inversely proportional to distance? Or constant drag?
                // Constant drag is annoying but fair.
                // Pull force 15 m/s^2
                // We directly modify player velocity? Or position?
                // Player velocity is handled in player update.
                // Let's cheat and move player:
                this.player.position.add(dirToBoss.multiplyScalar(0.2)); 
            }

            if (elapsed >= pullDuration) {
                clearInterval(interval);
                this.scene.remove(well);
            }
        }, 50);
    }

    attackElectron(dir) {
        // Fire Electron
        if (!this.projectiles) return;
        const spawnPos = this.mesh.position.clone().add(dir.multiplyScalar(4));
        const proj = new Projectile(spawnPos, dir, false);
        proj.velocity = dir.multiplyScalar(20);
        proj.damage = 15;
        proj.radius = 1.0;
        proj.mesh.geometry = new THREE.SphereGeometry(1, 16, 16);
        proj.mesh.material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.scene.add(proj.mesh);
        this.projectiles.push(proj);
    }

    radiationPulse() {
        // Create expanding sphere
        const geo = new THREE.SphereGeometry(1, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.copy(this.mesh.position);
        this.scene.add(sphere);

        // Animate expansion
        const maxRadius = 30;
        const expandSpeed = 20;
        let radius = 1;

        const expandInterval = setInterval(() => {
            radius += expandSpeed * 0.05; // 50ms steps
            sphere.scale.setScalar(radius);
            
            // Check player collision
            const d = this.player.position.distanceTo(this.mesh.position);
            if (d < radius && d > radius - 2) {
                this.player.takeDamage(15); // Hit by wave edge
            }

            if (radius >= maxRadius) {
                clearInterval(expandInterval);
                this.scene.remove(sphere);
            }
        }, 50);
    }

    beamSweep() {
        // Warning
        // Implementation: create cylinder, rotate it
        // Simplified for now: Just shoot 3 fast electrons in spread?
        // Or actually implement beam? 
        // Let's do a "Triple Shot" for now as placeholder for Beam until ParticleSystem supports rays
        
        const centerDir = new THREE.Vector3().subVectors(this.player.position, this.mesh.position).normalize();
        const leftDir = centerDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), 0.3);
        const rightDir = centerDir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), -0.3);
        
        this.attackElectron(centerDir);
        setTimeout(() => this.attackElectron(leftDir), 200);
        setTimeout(() => this.attackElectron(rightDir), 400);
    }
    takeDamage(amount) {
        if (this.isDying) return;
        super.takeDamage(amount);
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDying = true; // Prevent AI logic, but keep in scene
            this.isDead = false; // Prevent Game from removing me
            this.explode();
        }
    }

    explode() {
        console.log("ATOM BOSS FISSION!");
        // Stop movement
        this.velocity = new THREE.Vector3();
        
        // Animation Loop
        let elapsed = 0;
        const duration = 4.0;
        
        // Store original positions for expansion
        this.nucleus.children.forEach(child => {
            child.userData.expandDir = child.position.clone().normalize();
            if (child.userData.expandDir.length() === 0) child.userData.expandDir.set(0,1,0);
        });

        const deathInterval = setInterval(() => {
            elapsed += 0.05;
            const progress = elapsed / duration;
            
            // 1. Expand Nucleus
            this.nucleus.rotation.y += 0.5;
            this.nucleus.scale.setScalar(1 + progress * 5); // Grow huge
            
            // 2. Continuous Explosions
            if (Math.random() < 0.3) {
                // Random position within expanding nucleus
                const offset = new THREE.Vector3(
                    (Math.random()-0.5) * 10 * progress,
                    (Math.random()-0.5) * 10 * progress,
                    (Math.random()-0.5) * 10 * progress
                );
                const pos = this.mesh.position.clone().add(offset);
                
                // Use Scene's ParticleSystem if available
                if (this.scene.userData.particleSystem) {
                     // Scale increases with time (5x to 20x)
                     const scale = 5 + (progress * 15);
                     this.scene.userData.particleSystem.createExplosion(pos, 0x00ff00, 10, scale);
                }
            }
            
            this.nucleus.children.forEach(child => {
                // Jiggle
                child.position.add(new THREE.Vector3(
                    (Math.random()-0.5)*0.5,
                    (Math.random()-0.5)*0.5,
                    (Math.random()-0.5)*0.5
                ));
                // Expand outward
                if (child.userData.expandDir) {
                    child.position.add(child.userData.expandDir.multiplyScalar(0.2));
                }
            });

            // 2. Electrons fly off tangent
            this.electrons.forEach(elec => {
                elec.mesh.position.add(elec.axis.clone().multiplyScalar(1.0)); // Fly away
                elec.mesh.scale.multiplyScalar(0.9); // Shrink
            });

            // 3. Shake Screen violently
            if (this.player) this.player.applyScreenShake(2.0);

            // 4. White Flash at end
            if (elapsed > 3.0 && elapsed < 3.2) {
                // Creating a flash overlay via DOM might be cleaner, 
                // but let's just make the boss emissive white
                this.mesh.traverse(c => {
                    if (c.material) {
                        c.material.emissive = new THREE.Color(0xffffff);
                        c.material.emissiveIntensity = 10;
                    }
                });
            }

            if (elapsed >= duration) {
                clearInterval(deathInterval);
                this.isDead = true; 
                
                // Trigger Cutscene Logic
                const evt = new CustomEvent('boss-defeated', { 
                    detail: { bossName: this.name, position: this.mesh.position } 
                });
                document.dispatchEvent(evt);
            }
        }, 50);
    }
}
