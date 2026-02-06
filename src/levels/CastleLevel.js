import * as THREE from 'three';
import { CitadelEye } from '../entities/CitadelEye.js';
import { ShieldEnemy } from '../entities/ShieldEnemy.js';

export class CastleLevel {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.player = game.player;
        this.input = game.input;
        
        this.isActive = false;
        this.eye = null;
        this.name = 'CASTLE'; // For WaveManager checks
    }

    enter() {
        console.log("ENTERING LEVEL: CASTLE GATE");
        this.isActive = true;
        
        // 1. Cleanup Old Scene
        this.clearScene();
        
        // 2. Restore Player State
        this.game.isCinematic = false;
        this.game.isPaused = false;
        this.input.enabled = true;
        this.player.isFlying = false;
        
        // Restore FPS State
        if (this.player.mesh) this.player.mesh.visible = false; 
        if (this.player.weaponSystem && this.player.weaponSystem.container) {
            this.player.weaponSystem.container.visible = true; 
        }
        this.game.spawnPoint = new THREE.Vector3(0, 20, -800);
        this.player.teleport(this.game.spawnPoint);
        
        // 4. Build Level Geometry
        this.buildGate();
        
        // 5. Setup Environment
        this.setupEnvironment();
        this.createCastleGround();
        
        // 6. UI Update
        this.game.updateMissionOverlay("OBJECTIVE: SURVIVE THE WATCHER", "#ff0000");

        // 7. Spawn Amenities
        this.spawnEye();
        this.spawnGuards();
        
        document.body.requestPointerLock();
        
        // 8. Start Wave 11
        if (this.game.waveManager) {
            this.game.waveManager.currentWave = 10; // Sets it to 10 so startNextWave makes it 11
            this.game.waveManager.waveInProgress = false; // Reset state
            this.game.waveManager.enemies = []; // Clear old enemies ref
            this.game.waveManager.enemiesToSpawn = 0;
            
            this.game.waveManager.startNextWave();
            
            // Force Display Update
            const waveDisplay = document.getElementById('wave-display');
            if (waveDisplay) waveDisplay.innerText = "11";
        }
    }

    spawnEye() {
        // Eye on top of the arch
        const eyePos = new THREE.Vector3(0, 110, -1000); 
        this.eye = new CitadelEye(this.scene, this.player, eyePos);
    }
    
    // Old spawnGuards removed.

    update(dt) {
        if (!this.isActive) return;
        
        if (this.eye) {
            this.eye.update(dt);
        }
    }
// ... methods continue ...

    clearScene() {
        // Clear Entities using Manager
        if (this.game.entityManager) {
            this.game.entityManager.clear();
        }

        this.game.projectiles.forEach(p => {
             if (p.mesh) this.scene.remove(p.mesh);
        });
        this.game.projectiles = []; // This is still a direct array in Game.js, so it's fine.
        // Remove world chunks?
        if (this.game.worldGen) {
             this.game.worldGen.clear();
        }
    }

    buildGate() {
        // Big Cyberpunk Gate at -1000
        const z = -1000;
        
        // Pillars
        const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        
        const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(20, 100, 20), mat);
        leftPillar.position.set(-30, 50, z);
        this.scene.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(20, 100, 20), mat);
        rightPillar.position.set(30, 50, z);
        this.scene.add(rightPillar);
        
        // Arch
        const arch = new THREE.Mesh(new THREE.BoxGeometry(80, 20, 20), mat);
        arch.position.set(0, 90, z);
        this.scene.add(arch);
        
        // Energy Shield
        const shieldGeo = new THREE.PlaneGeometry(40, 80);
        const shieldMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(0, 40, z);
        this.scene.add(shield);
    }
    
    createCastleGround() {
        // Infinite dark floor for castle
        // Positioned at y=0, large scale
        const geometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x050505, 
            roughness: 0.9, 
            metalness: 0.2 
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Helper for entities to interact with floor?
        // Entities use game.getTerrainHeight
        // We override that for CastleLevel
        this.game.getTerrainHeight = (x, z) => 0; // Flat floor
    }
    
    setupEnvironment() {
        // Darker Sky
        this.scene.background = new THREE.Color(0x100010);
        this.scene.fog = new THREE.FogExp2(0x100010, 0.0015);
        
        // Red Ambient Light
        const ambient = new THREE.AmbientLight(0x400000);
        this.scene.add(ambient);
        
        // Sun is gone, only artificial light
        this.game.sunLight.intensity = 0.2;
        this.game.sunLight.color.setHex(0xff0000);
    }

    spawnGuards() {
        // Spawn 2 Shield Guards guarding the gate
        // We use Game.spawnEnemy but we need precise positioning.
        // Game.spawnEnemy logic randomizes position usually.
        // We should manually spawn here or add "forcePosition" to spawnEnemy?
        // Let's manually instantiate since we are inside Level who knows imports?
        // Actually, let's just use the classes directly for specific placement.
        
        const g1 = new ShieldEnemy(this.scene, new THREE.Vector3(-15, 0, -900));
        const g2 = new ShieldEnemy(this.scene, new THREE.Vector3(15, 0, -900));
        
        // Add to EntityManager logic
        if (this.game.entityManager) {
            this.game.entityManager.enemies.push(g1, g2);
        }
    }

    update(dt) {
        if (!this.isActive) return;
        
        // Standard Game Update happens in Game.js...
        // But if Game.js delegates to this level:
        // this.game.updateGameLogic(dt); // Re-use standard logic?
        
        // Game.js `update` usually handles enemies/player/collision.
        // If we set `this.game.currentLevel = castleLevel`, Game.js assumes it overrides EVERYTHING?
        // Or Game.js only overrides if `mode === 'SPACE_FLIGHT'`.
        // If we are in 'CASTLE' mode, we might want STANDARD FPS physics.
        // So Game.js update loop should flow normally?
        
        // YES. We want standard FPS loop. 
        // So loadLevel just sets up the scene, sends player there, and Game.js continues as normal.
    }
}
