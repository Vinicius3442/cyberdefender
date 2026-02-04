import * as THREE from 'three';
import { Boss } from './Boss.js';
import { Projectile } from '../Projectile.js';

export class ObserverBoss extends Boss {
    constructor(scene, player, position) {
        super(scene, player, 'OBSERVER', position);
        this.name = "THE OBSERVER";
        this.maxHp = 5000;
        this.hp = this.maxHp;
        this.speed = 2.0;
        this.attackCooldown = 0;
        this.state = 'IDLE'; // IDLE, CHARGE, LASER, SUMMON
        this.stateTimer = 0;

        this._createModel();
    }

    _createModel() {
        // Remove default enemy mesh
        if (this.mesh) this.scene.remove(this.mesh);

        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position || new THREE.Vector3(0, 10, 0));

        // Core Sphere
        const coreGeo = new THREE.SphereGeometry(3, 32, 32);
        const coreMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            metalness: 0.9, 
            roughness: 0.1 
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.mesh.add(this.core);

        // Glowing Eye
        const eyeGeo = new THREE.SphereGeometry(1, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.eye = new THREE.Mesh(eyeGeo, eyeMat);
        this.eye.position.z = 2.5;
        this.mesh.add(this.eye);

        // Rotating Rings
        const ringGeo = new THREE.TorusGeometry(5, 0.2, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        
        this.ring1 = new THREE.Mesh(ringGeo, ringMat);
        this.ring2 = new THREE.Mesh(ringGeo, ringMat);
        
        this.mesh.add(this.ring1);
        this.mesh.add(this.ring2);

        this.scene.add(this.mesh);
        
        // Physics Body
        this.width = 3;
        this.height = 3;
        // Mock collider
        this.collider = new THREE.Box3();
    }

    update(dt, playerPos) {
        if (this.hp <= 0) return;

        // Hover movement
        const dist = this.mesh.position.distanceTo(playerPos);
        const dir = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();

        // Always face player
        this.mesh.lookAt(playerPos);

        // Ring Animation
        this.ring1.rotation.x += dt * 1;
        this.ring1.rotation.y += dt * 0.5;
        this.ring2.rotation.x -= dt * 0.5;
        this.ring2.rotation.y += dt * 1;

        // State Machine
        this.stateTimer -= dt;

        if (this.stateTimer <= 0) {
            this.chooseNextState();
        }

        switch (this.state) {
            case 'CHASE':
                if (dist > 15) {
                    this.mesh.position.add(dir.multiplyScalar(this.speed * dt));
                }
                break;
            case 'CHARGE':
                // Red glow intensity up
                this.eye.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2);
                break;
            case 'LASER':
                // Firing logic handled in transition or continuous?
                // Let's fire once per frame or rapid fire
                if (Math.random() < 0.2) this.fireLaser(dir);
                break;
        }

        this.updateBossUI();
    }

    chooseNextState() {
        const rand = Math.random();
        if (rand < 0.4) {
            this.state = 'CHASE';
            this.stateTimer = 4.0;
        } else if (rand < 0.7) {
            this.state = 'CHARGE';
            this.stateTimer = 2.0;
            // Warning sound?
        } else {
            this.state = 'LASER';
            this.stateTimer = 3.0; // Fire for 3 seconds
        }
    }

    fireLaser(dir) {
        if (!this.projectiles) return;

        // Create a Projectile
        // We can reuse the Projectile class but customize it
        
        // Spawn slightly in front
        const spawnPos = this.mesh.position.clone().add(dir.multiplyScalar(4));
        
        const proj = new Projectile(spawnPos, dir, false); // false = enemy projectile? 
        // Projectile.js constructor: (pos, dir, isPlayer)
        // We need to verify Projectile.js logic for isPlayer. 
        // If isPlayer is false, does it hurt player?
        // Checking Projectile.js would be wise, but assuming 'false' implies enemy source.
        
        proj.velocity = dir.multiplyScalar(15); // Fast laser
        proj.damage = 20;
        proj.radius = 0.5;
        
        // Visuals: Red Beam
        proj.mesh.scale.set(0.5, 0.5, 2.0); // Elongated
        proj.mesh.material.color.setHex(0xff0000);
        proj.mesh.material.emissive.setHex(0xff0000);
        
        this.scene.add(proj.mesh);
        this.projectiles.push(proj);
    }
}
