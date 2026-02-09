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
        this.buildCastle();

        // 5. Setup Environment
        this.setupEnvironment();
        this.createCastleGround();

        // 6. UI Update
        this.game.updateMissionOverlay("OBJECTIVE: SURVIVE THE WATCHER", "#ff0000");

        // 7. Spawn Amenities
        this.spawnEye();
        this.spawnGuards();

        // Spawn Point update: Visible from Wasteland
        // Castle at -1200. Let's spawn player at -800 looking at it? 
        // Or further back? -200 is "Wasteland side".
        // Let's put player on the road.
        this.game.spawnPoint = new THREE.Vector3(0, 5, -200);
        this.player.teleport(this.game.spawnPoint);
        // Look at castle
        // Update lookAt to new Castle Position
        // Fix: Don't look at top of tower to avoid CitadelEye damage trigger
        this.player.camera.lookAt(0, 10, -1000); // Look low at gate, not eye

        document.body.requestPointerLock();

        // 8. Start Wave 11
        if (this.game.waveManager) {
            this.game.waveManager.currentWave = 10; // Sets it to 10 so startNextWave makes it 11
            this.game.waveManager.waveInProgress = false; // Reset state
            // Enemies reference is shared with EntityManager, so relying on clearScene() is correct.
            // Do NOT reassign enemies to [] here.
            this.game.waveManager.enemiesToSpawn = 0;

            this.game.waveManager.startNextWave();

            // Force Display Update
            const waveDisplay = document.getElementById('wave-display');
            if (waveDisplay) waveDisplay.innerText = "11";
        }
    }

    spawnEye() {
        // Eye on top of the Central Tower
        const eyePos = new THREE.Vector3(0, 750, -2000);
        this.eye = new CitadelEye(this.scene, this.player, eyePos);
        // FIX: Make it visibly huge
        if (this.eye.mesh) {
            this.eye.mesh.scale.set(10, 10, 10); // 10x larger
        }
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

        // CRITICAL FIX: Do NOT replace the array instance, or Collision.js loses reference!
        this.game.projectiles.length = 0;

        // Remove world chunks?
        if (this.game.worldGen) {
            this.game.worldGen.clear();
        }
    }

    buildCastle() {
        // High Tech Castle (Sauron Tower Style)
        if (this.game.worldGen) {
            this.game.worldGen.spawnTechCastle();

            // OPTIMIZATION: Disable Shadows on Props/Lights to fix GPU Crash
            // Iterate scene to find the newly added lights?
            // WorldGenerator pushes to 'this.props'.
            this.game.worldGen.props.forEach(prop => {
                prop.traverse(child => {
                    if (child.isPointLight) {
                        // Disable shadow for performance
                        child.castShadow = false;
                    }
                });
            });
        } else {
            console.error("WorldGenerator not found in CastleLevel!");
        }
    }

    createCastleGround() {
        // 1. Base Dark Floor (Tech Bricks implied by material/roughness)
        const geometry = new THREE.PlaneGeometry(3000, 3000, 128, 128);
        const material = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.4,
            metalness: 0.5,
            wireframe: false // Solid
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 2. Neon Road leading to Castle
        const roadGeo = new THREE.PlaneGeometry(40, 3000);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x111133,
            emissiveIntensity: 0.2
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.1; // Slightly above ground
        road.receiveShadow = true;
        this.scene.add(road);

        // 3. Road Edges (Neon Lines)
        const edgeGeo = new THREE.PlaneGeometry(1, 3000);
        const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Cyan Neon

        const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
        leftEdge.rotation.x = -Math.PI / 2;
        leftEdge.position.set(-20, 0.2, 0);
        this.scene.add(leftEdge);

        const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
        rightEdge.rotation.x = -Math.PI / 2;
        rightEdge.position.set(20, 0.2, 0);
        this.scene.add(rightEdge);

        // 4. Grid Effect (Tech Bricks) - Using GridHelper
        // Large grid for the "Wasteland/Castle" floor feel
        const grid = new THREE.GridHelper(3000, 150, 0x333333, 0x111111);
        grid.position.y = 0.05;
        this.scene.add(grid);

        // Override terrain height
        const flatHeight = (x, z) => 0; // Flat floor
        this.game.getTerrainHeight = flatHeight;
        this.scene.userData.getTerrainHeight = flatHeight; // Fix: Enemies read from scene.userData
    }

    setupEnvironment() {
        // Darker Sky
        this.scene.background = new THREE.Color(0x100010);
        // Reduce density to see the castle at -2000
        // 0.0005 -> Visibility well past 2000
        this.scene.fog = new THREE.FogExp2(0x100010, 0.0005);

        // Red Ambient Light
        const ambient = new THREE.AmbientLight(0x400000);
        this.scene.add(ambient);

        // Sun is gone, only artificial light
        this.game.sunLight.intensity = 0.2;
        this.game.sunLight.color.setHex(0xff0000);
    }

    spawnGuards() {
        // Spawn 2 Shield Guards guarding the gate
        // Gate/Wall is at -1200
        const g1 = new ShieldEnemy(this.scene, new THREE.Vector3(-30, 0, -1180));
        const g2 = new ShieldEnemy(this.scene, new THREE.Vector3(30, 0, -1180));

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
