import * as THREE from 'three';
import { Utils } from '../core/Utils.js';

export class SpaceLevel {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.player = game.player;
        
        this.enemies = [];
        this.asteroids = [];
        this.isActive = false;
        
        // Ship Physics
        this.velocity = new THREE.Vector3();
        this.speed = 0;
        this.maxSpeed = 100;
        this.rotationSpeed = 2.0; // Multiplier
        this.roll = 0;
        
        // Input State (Copy from game input)
        this.input = game.input;
    }

    enter() {
        console.log("Entering Space Level...");
        this.isActive = true;
        
        // 1. Clear Scene
        this.clearScene();

        // 2. Setup Environment
        this.createStarfield();
        this.createEarth();
        this.createSun();
        this.createAsteroids();

        // 3. Setup Player for Flight
        this.player.isFlying = true; 
        this.player.mesh.visible = false; 
        this.player.velocity.set(0,0,0);
        
        // Reset Camera
        this.camera.position.set(0, 0, 100);
        this.camera.rotation.set(0, 0, 0);
        this.camera.lookAt(0, 0, -2000); 
        
        // UI
        this.game.updateMissionOverlay("PHASE 5: ORBITAL ASSAULT", "#00ffff");

        // 4. Override Input for Flight
        // Save original to restore later
        this.originalMouseMove = this.input.onMouseMove;
        // Override
        this.input.onMouseMove = (dx, dy) => this.onMouseMove(dx, dy);
    }

    onMouseMove(dx, dy) {
        if (!this.isActive) return;
        
        const sensitivity = 0.002;
        // Pitch (X)
        // Invert Y for flight feel? Usually yes.
        this.camera.rotateX(-dy * sensitivity);
        
        // Yaw (Y) - In 6DOF, we rotate around local Y
        this.camera.rotateY(-dx * sensitivity);
    }

    update(dt) {
        if (!this.isActive) return;

        // FLIGHT PHYSICS (Arcade Style)
        const moveSpeed = 100 * dt; 
        const rotSpeed = 2.0 * dt;

        // Thrust
        if (this.input.keys.forward) {
            this.camera.translateZ(-moveSpeed);
        }
        if (this.input.keys.backward) {
            this.camera.translateZ(moveSpeed * 0.5);
        }

        // Roll (A/D)
        if (this.input.keys.left) this.camera.rotateZ(rotSpeed);
        if (this.input.keys.right) this.camera.rotateZ(-rotSpeed);
        
        // Auto-stabilize roll slightly?
        // NO, user wants to fly freely.
    }

    clearScene() {
        // Remove everything except camera and player (player mesh hidden)
        for(let i = this.scene.children.length - 1; i >= 0; i--) { 
            const obj = this.scene.children[i];
            // Don't remove Camera, Player Structure (unless we rebuild), or Systems?
            // Actually, LevelManager should handle this cleanly.
            // For prototype:
            if (obj !== this.camera && obj !== this.player.mesh) {
                this.scene.remove(obj);
            }
        }
        // Re-add lights if we killed them
    }

    createStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 5000;
        const pos = [];
        for(let i=0; i<starCount; i++) {
            const x = (Math.random() - 0.5) * 4000;
            const y = (Math.random() - 0.5) * 4000;
            const z = (Math.random() - 0.5) * 4000;
            pos.push(x,y,z);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({color: 0xffffff, size: 0.8});
        this.stars = new THREE.Points(starGeo, mat);
        this.scene.add(this.stars);
    }

    createEarth() {
        const geo = new THREE.SphereGeometry(1000, 64, 64);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x2233ff, 
            roughness: 0.8,
            emissive: 0x112244,
            emissiveIntensity: 0.2
        });
        this.earth = new THREE.Mesh(geo, mat);
        this.earth.position.set(0, -1500, -2000); 
        this.scene.add(this.earth);
    }

    createSun() {
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(100, 100, 100);
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0x222222));
    }

    createAsteroids() {
        const geo = new THREE.DodecahedronGeometry(5, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
        
        for(let i=0; i<50; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500 - 200
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            mesh.scale.setScalar(1 + Math.random() * 2);
            this.asteroids.push(mesh);
            this.scene.add(mesh);
        }
    }
}
