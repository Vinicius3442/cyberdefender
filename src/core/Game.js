import * as THREE from 'three';
import { Utils } from './Utils.js';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { WaveManager } from '../systems/WaveManager.js';
import { Collision } from '../systems/Collision.js';
import { UpgradeManager } from '../systems/UpgradeManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { NetworkManager } from './NetworkManager.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { BootSequence } from '../ui/BootSequence.js';
import { ShellMenu } from '../ui/ShellMenu.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { RangedEnemy } from '../entities/RangedEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';
import { LauncherEnemy } from '../entities/LauncherEnemy.js';
import { WeaponConfig } from './WeaponSystem.js';
import { WeaponPickup } from '../entities/WeaponPickup.js';
import { WorldGenerator } from './WorldGenerator.js';
import { AtomBoss } from '../entities/Bosses/AtomBoss.js';
import { ED209 } from '../entities/Bosses/ED209.js';
import { ArsenalMenu } from '../ui/ArsenalMenu.js';
// ArsenalLevel replaced by ArsenalMenu
import { ArenaLevel } from '../levels/ArenaLevel.js';

export class Game {
    constructor(mode = 'SP', mpParams = {}) {
        this.mode = mode; // 'SP' (Single Player) or 'MP' (Multiplayer)
        this.mpParams = mpParams; // { host: boolean, id: string, name: string, skin: string }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.input = null;
        this.player = null;
        this.waveManager = null;
        this.collision = null;
        this.upgradeManager = null;
        this.particleSystem = null;
        this.clock = new THREE.Clock();
        this.projectiles = [];
        this.enemies = [];
        this.pickups = [];
        this.chests = [];
        this.remotePlayers = {}; // id -> RemotePlayer
        this.network = null;
        this.isPaused = false;
        this.isInLobby = false; // New flag
        this.mpGameParams = {
            started: false
        };
        this.interactables = [];
        this.portals = [];


        this.init();
    }

    }

    dispose() {
        // Stop Loop
        this.renderer.setAnimationLoop(null);
        
        // Remove Listeners
        window.removeEventListener('resize', this._onResize); 
        document.removeEventListener('player-drop-item', this._onDropItem);
        document.removeEventListener('spawn-pickup', this._onSpawnPickup);
        document.removeEventListener('enemy-death', this._onEnemyDeath);
        
        // DOM Cleanup
        const container = document.getElementById('game-container');
        if (container && this.renderer) {
            container.removeChild(this.renderer.domElement);
        }
        
        // Cleanup Scene
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }

    init() {
        // Read Params from Shell (Global)
        if (window.GAME_PARAMS) {
            console.log("GAME PARAMS DETECTED:", window.GAME_PARAMS);
            if (window.GAME_PARAMS.bossQueue) {
                this.pendingBoss = window.GAME_PARAMS.bossQueue; 
            }
            if (window.GAME_PARAMS.infiniteAmmo) {
                 this.infiniteAmmoCheat = true;
            }
        }

        // Setup Three.js
        this.scene = new THREE.Scene();
        // Texture Loader
        // Procedural Sky
        this.createSky();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        if (this.mode === 'BOSSRUSH') {
             console.log("INITIALIZING BOSS RUSH MODE: 2D ARSENAL");
             
             // 1. Use Standard World for Stability
             this.worldGen = new WorldGenerator(this.scene);
             this.worldGen.generateLevel();
             // Override terrain height helper (though WorldGen sets it usually? No, Game.js sets it below for SP)
             this.scene.userData.getTerrainHeight = (x, z) => this.worldGen.getHeight(x, z);

             // 2. Set Safe Spawn (High up to prevent floor clip)
             const startH = this.worldGen.getHeight(0, 0);
             this.spawnPoint = new THREE.Vector3(0, startH + 10, 0);
             
             this.arsenalMenu = new ArsenalMenu(this, (loadout) => {
                 this.startBossMatch(loadout);
             });
             this.arsenalMenu.show();
             this.isPaused = true; 
             // Force unlock after a tiny delay to override any auto-locks
             setTimeout(() => document.exitPointerLock(), 100);

        } else {
            // SP / MP Normal
            this.worldGen = new WorldGenerator(this.scene);
            this.worldGen.generateLevel();
            this.scene.userData.getTerrainHeight = (x, z) => this.worldGen.getHeight(x, z);
            
            const startH = this.worldGen.getHeight(0, 0);
            this.spawnPoint = new THREE.Vector3(0, startH + 20, 0); // Higher spawn for safety
        }

        // Input
        this.input = new Input();
        this.input.onPause = () => this.togglePause();
        this.input.onInventory = () => this.toggleInventory();
        this.input.onInteract = () => this.checkInteraction(); 
        
        // Player Action Bindings
        this.input.onAttack = () => { /* Attack handled in update loop */ };
        this.input.onReload = () => { 
            console.log("GAME: RELOAD KEY PRESSED"); 
            if (this.isPaused && this.mode !== 'BOSSRUSH') return; // Allow some input if strictly UI, but generally paused blocks.
            // Actually, if Paused for Arsenal, we don't want reload.
            if (this.isPaused) return;

            if (this.player) this.player.reload(); 
        };
        this.input.onDrop = () => { 
            if (this.isPaused) return;
            if (this.player) this.player.dropWeapon(); 
        };
        this.input.onSwitchWeapon = (slot) => { 
            if (this.isPaused) return;
            if (this.player) this.player.switchWeapon(slot); 
        };
        this.input.onInteract = () => { 
            if (this.isPaused) return;
            this.checkInteraction(); 
        };
        this.input.onZoom = (active) => { 
            if (this.isPaused) return;
            if (this.player) this.player.toggleScope(active); 
        };

        // Player
        this.player = new Player(this.camera, this.input, this.scene, this.projectiles, this.playerSkinURL);
        this.player.game = this; 
        
        // Apply Spawn
        this.player.position.copy(this.spawnPoint);
        this.player.velocity.y = 0;

        // Systems
        this.particleSystem = new ParticleSystem(this.scene);
        this.upgradeManager = new UpgradeManager(this);
        
        if (this.mode === 'SP') {
            this.waveManager = new WaveManager(this.scene, this.player, this.enemies, this.upgradeManager, this);
        } else if (this.mode === 'BOSSRUSH') {
            // No wave manager initially. 
            // We manage flow manually or via ArenaLevel logic later.
        }
        
        this.collision = new Collision(this.player, this.enemies, this.projectiles, this.particleSystem);

        // Pass particle system to player for slash effects
        this.player.particleSystem = this.particleSystem;

        // Events
        this._onResize = () => this.onWindowResize();
        this._onDropItem = (e) => this.spawnPickup(e.detail.position, e.detail.type);
        this._onSpawnPickup = (e) => this.spawnPickup(e.detail.position, e.detail.type);
        this._onEnemyDeath = (e) => {
             if (e.detail.type === 'EXPLOSION') {
                this.particleSystem.createExplosion(e.detail.position, 0xff0000, 20); // Visual only
            }
        };

        window.addEventListener('resize', this._onResize, false);
        document.addEventListener('player-drop-item', this._onDropItem);
        document.addEventListener('spawn-pickup', this._onSpawnPickup);
        document.addEventListener('enemy-death', this._onEnemyDeath);

        // Initial Spawn Check (Cheats)
        if (this.pendingBoss) {
            setTimeout(() => {
                const type = this.pendingBoss.toUpperCase();
                console.log("EXECUTING CHEAT SPAWN:", type);
                this.spawnEnemy(type);
                this.player.createFloatingText(this.player.position, `CHEAT: ${type}`, "#ff00ff");
                this.pendingBoss = null;
            }, 2000); // Delay slightly for world load
        }
        
        // Inventory Hover State
        this.hoveredSlot = -1;
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f') {
                const invMenu = document.getElementById('inventory-menu');
                if (invMenu.style.display !== 'none' && this.hoveredSlot !== -1) {
                    this.player.removeWeapon(this.hoveredSlot);
                    this.renderInventory(); // Refresh UI
                }
            }
        });

        // KONAMI CODE CHEAT
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiIndex = 0;
        
        // DEV CHEATS (String Buffer)
        this.cheatBuffer = "";
        this.cheats = {
            "ed209": () => this.spawnBoss('ED209'),
            "worm": () => this.spawnBoss('DEVOURER'),
            "eye": () => this.spawnBoss('OBSERVER'),
            "dragon": () => this.spawnBoss('DRAGON'),
            "nemesis": () => this.spawnBoss('NEMESIS'),
            "ammo": () => this.player.addAmmoToAll(1.0),
            "god": () => { this.player.isInvincible = !this.player.isInvincible; alert("GOD MODE: " + this.player.isInvincible); }
        };

        // Inventory Toggle
        this.input.onInventory = () => {
            const invMenu = document.getElementById('inventory-menu');
            if (invMenu) {
                if (invMenu.style.display === 'none') {
                    invMenu.style.display = 'flex';
                    document.exitPointerLock();
                    this.isPreviewActive = true;
                    this.renderInventory();
                } else {
                    invMenu.style.display = 'none';
                    document.body.requestPointerLock();
                    this.isPreviewActive = false;
                }
            }
        };

        document.addEventListener('keydown', (e) => {
            // Konami
            if (e.key === this.konamiCode[this.konamiIndex]) {
                this.konamiIndex++;
                if (this.konamiIndex === this.konamiCode.length) {
                    this.activateKonamiCheat();
                    this.konamiIndex = 0;
                }
            } else {
                this.konamiIndex = 0; 
            }

            // String Cheats (Only a-z)
            if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
                this.cheatBuffer += e.key.toLowerCase();
                if (this.cheatBuffer.length > 20) this.cheatBuffer = this.cheatBuffer.slice(-20);
                
                Object.keys(this.cheats).forEach(code => {
                    if (this.cheatBuffer.endsWith(code)) {
                        console.log("CHEAT ACTIVATED:", code);
                        this.createFloatingText(this.player.position, "CHEAT: " + code.toUpperCase(), "#ff00ff");
                        this.cheats[code]();
                        this.cheatBuffer = ""; // Reset
                    }
                });
            }
        });

        // Setup MP
        if (this.mode === 'MP') {
            this.initMultiplayer();
        }

        // Start Logic
        // NOTE: this.animate() REMOVED. Must be called EXPLICITLY by consumer (main.js)
        if (this.mode === 'SP') {
            // Request Pointer Lock immediately handled in main.js
        } else {
            // MP starts in lobby state
            this.isInLobby = true;
        }
    }

    getTerrainHeight(x, z) {
        if (this.worldGen) {
            return this.worldGen.getHeight(x, z);
        }
        return 0;
    }

    initMultiplayer() {
        // Unlock all weapons
        const allWeapons = Object.keys(WeaponConfig);
        this.player.inventory = allWeapons;
        this.player.switchWeapon(0);

        this.network = new NetworkManager(this);

        // Setup Callbacks
        this.network.onPlayerJoin = (id, data) => this.onMPPlayerJoin(id, data);
        this.network.onPlayerUpdate = (id, data) => this.onMPPlayerUpdate(id, data);
        this.network.onPlayerAction = (id, data) => this.onMPPlayerAction(id, data);
        this.network.onPlayerDisconnect = (id) => this.onMPPlayerDisconnect(id);

        // Error handling
        this.network.onError = (err) => {
            alert("Connection Error: " + (err.type || err));
            if (err.type === 'unavailable-id') {
                window.location.reload();
            }
        };

        // Client specific
        this.network.onWorldUpdate = (data) => this.onMPWorldUpdate(data);
        this.network.onEvent = (data) => this.onMPEvent(data); // Handle Start Match

        // Initialize based on role
        if (this.mpParams.host) {
            this.network.hostGame(this.mpParams.id);
            // UI handled in main.js via callbacks or events, 
            // but for now Game.js handles logic. 
            // We need to notify Main.js that ID is ready.
            this.network.onReady = (id) => {
                const ev = new CustomEvent('mp-host-ready', { detail: { id: id } });
                window.dispatchEvent(ev);
            };
        } else {
            this.network.joinGame(this.mpParams.hostId);
        }

        // Update UI hooks
        this.network.onConnectionListUpdate = (list) => {
            const ev = new CustomEvent('mp-player-list', { detail: { players: list } });
            window.dispatchEvent(ev);
        };

        // Override Input Attack to send network event
        const originalAttack = this.player.attack.bind(this.player);
        this.player.attack = () => {
            originalAttack();
            // Send attack event
            // Logic handled inside Player but we might need to hook it better
            // For now, let's just send a simple "I shot" event
            if (this.player.attackCooldown > 0) return; // Debounce check matches player

            this.network.sendClientAction('shoot', {
                pos: this.player.camera.position,
                dir: this.player.camera.getWorldDirection(new THREE.Vector3()),
                weapon: this.player.getCurrentWeaponType()
            });
        };
    }

    togglePause() {
        if (!this.mpGameParams.started && this.mode === 'MP') return; // Don't pause in lobby
        if (!this.player) return;

        // If Inventory is open, close it instead of normal pause
        const invMenu = document.getElementById('inventory-menu');
        if (invMenu.style.display !== 'none') {
            this.toggleInventory();
            return;
        }

        this.isPaused = !this.isPaused;

        const gameOverScreen = document.getElementById('game-over-screen');
        const pauseMenu = document.getElementById('pause-menu');

        // Check if game over is active
        const isGameOver = gameOverScreen && gameOverScreen.style.display !== 'none';

        if (this.isPaused) {
            if (isGameOver) {
                // Game Over takes precedence, ensure pointer is unlocked
                document.exitPointerLock();
            } else {
                // Formatting: Pause Menu
                if (pauseMenu) pauseMenu.style.display = 'flex';
                document.exitPointerLock();
            }
            
            // Stop Moving Inputs
            this.input.keys.forward = false;
            this.input.keys.backward = false;
            this.input.keys.left = false;
            this.input.keys.right = false;
            this.input.keys.attack = false;
            
        } else {
            // Unpause
            if (isGameOver) {
                 // Cannot unpause during game over!
                 this.isPaused = true; 
                 return;
            }

            if (pauseMenu) pauseMenu.style.display = 'none';
            document.body.requestPointerLock();
            this.clock.getDelta(); // Reset clock
        }
    }

    toggleInventory() {
        if (!this.player) return;

        const invMenu = document.getElementById('inventory-menu');
        const pauseMenu = document.getElementById('pause-menu');
        const isClosed = invMenu.style.display === 'none';

        if (isClosed) {
            // Open Inventory
            this.isPaused = true;
            document.exitPointerLock();
            
            // Hide pause menu if visible (since we might have triggered pause via unlock)
            // Hide pause menu if visible (since we might have triggered pause via unlock)
            if (pauseMenu) pauseMenu.style.display = 'none';
            
            invMenu.style.display = 'flex';
            this.renderInventory();
        } else {
            // Close Inventory
            invMenu.style.display = 'none';
            
            // Resume Game
            this.isPaused = false;
            document.body.requestPointerLock();
            this.clock.getDelta();
        }
    }

    renderInventory() { 
        // Deprecated: Grid Inventory Removed logic.
        // We only use Hotbar now.
        // If anything calls this, redirect to Hotbar.
        this.renderHotbar();
    }



    renderHotbar() {
        const container = document.getElementById('hotbar-container');
        if (!container) return;

        // Optimization check
        const currentState = this.player.inventory.join(',') + ':' + this.player.currentSlot;
        if (this._lastHotbarState === currentState) return;
        this._lastHotbarState = currentState;

        container.innerHTML = '';

        // Fixed 3 Slots: Primary, Secondary, Melee
        this.player.inventory.forEach((type, i) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (i === this.player.currentSlot) slot.classList.add('active');

            // Visuals
            let content = `<span class="hotbar-key">${i + 1}</span>`;
            
            if (type) {
                const config = WeaponConfig[type];
                if (config) {
                    const icon = config.isMelee ? '⚔️' : '🔫';
                    content += `<div class="icon">${icon}</div><div class="name">${type.substring(0,3)}</div>`;
                }
            } else {
                 content += `<div class="name" style="opacity:0.5; font-size:10px;">EMPTY</div>`;
            }
            
            slot.innerHTML = content;
            container.appendChild(slot);
        });
    }

    checkInteraction() {
        // Iterate backwards safely
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const p = this.pickups[i];
            const d = p.mesh.position.distanceTo(this.player.position);
            
            if (d < pickupDist && d < minDist) {
                minDist = d;
                nearest = { pickup: p, index: i };
            }
        }

        if (nearest) {
            const p = nearest.pickup;
            
            if (p.type === 'AMMO') {
                this.player.addAmmoToAll(0.3); // 30% refill
                this.player.createFloatingText(p.mesh.position, "AMMO", "#00ff00");
            } else if (p.type === 'HEALTH') {
                this.player.hp = Math.min(this.player.hp + 25, this.player.maxHp);
                this.player.createFloatingText(p.mesh.position, "+25 HP", "#ff0000");
            } else {
                // WEAPON
                // Try to add or swap
                this.player.addWeapon(p.type);
            }

            // Remove pickup
            this.scene.remove(p.mesh);
            this.pickups.splice(nearest.index, 1);
            p.shouldRemove = true; // Flag for safety
        }
    }

    spawnPickup(position, type = null) {
        // Validation: Prevent "Hand" or invalid types
        if (type && type !== 'AMMO' && type !== 'HEALTH') {
            // Find matched casing
            const entries = Object.entries(WeaponConfig);
            const match = entries.find(([key, val]) => key.toUpperCase() === type.toUpperCase());
            
            if (match) {
                type = match[0]; // Use correct Casing (e.g. 'Pistol')
            } else {
                console.warn("Attempted to spawn invalid pickup type:", type);
                return;
            }
        }

        // Limit Check: Max 15 items on ground (Was 3, too low)
        if (this.pickups.length >= 15) {
            const old = this.pickups.shift(); // Remove oldest
            this.scene.remove(old.mesh);
        }

        const pickup = new WeaponPickup(this.scene, position, type);
        this.pickups.push(pickup);
    }

    getWeightedRandomDrop() {
        if (Math.random() < 0.3) return 'AMMO'; 
        const weights = {
            'common': 40,
            'uncommon': 35,
            'rare': 20,
            'legendary': 5
        };
        
        const tiers = {
            'common': ['PISTOL', 'SMG', 'SHOTGUN', 'BAT', 'KNIFE', 'MP5'],
            'uncommon': ['RIFLE', 'SNIPER', 'REVOLVER', 'M4A1', 'SCAR', 'P90', 'AXE'],
            'rare': ['MINIGUN', 'LAUNCHER', 'DEAGLE', 'KATANA', 'FAMAS', 'GRENADE_LAUNCHER', 'FLAMETHROWER'],
            'legendary': ['BFG', 'RAILGUN', 'LIGHTSABER', 'BARRETT', 'FREEZE_RAY', 'ALIEN_BLASTER']
        };

        const rand = Math.random() * 100; // 0-100
        let tier = 'common';
        if (rand > 95) tier = 'legendary';
        else if (rand > 80) tier = 'rare';
        else if (rand > 50) tier = 'uncommon';

        const pool = tiers[tier];
        const weaponKey = pool[Math.floor(Math.random() * pool.length)]; // String key like 'PISTOL'
        
        // We just need to return the KEY string (e.g. 'PISTOL') because spawnPickup handles it.
        // WeaponPickup expects a type string which matches keys in WeaponConfig.
        // Our 'tiers' arrays ALREADY contain these keys.
        
        return weaponKey;
    }

    spawnEnemy(type) {
        // ... (existing code, ensure it doesn't break) ...
        // I will just append spawnBoss below standard spawn logic or near it.
        // Actually, I need to read the file first to know where to put it properly.
    }

    spawnBoss(waveNum) {
        console.log("SPAWNING BOSS FOR WAVE", waveNum);
        
        // Determine Boss Type
        // Wave 10: Atom Boss (Nucleus)
        const pos = new THREE.Vector3(0, 15, -40); 
        
        if (waveNum % 10 === 0) {
            const boss = new AtomBoss(this.scene, this.player, pos);
            boss.projectiles = this.projectiles; 
            
            this.enemies.push(boss);
            this.scene.add(boss.mesh);

            // Spawn Arena
            this.worldGen.spawnBossArena(new THREE.Vector3(0,0,0));
            
            // Dramatic Effect (Camera Shake / Sound)
            this.player.applyScreenShake(0.5);
        }
    }

    activateKonamiCheat() {
        console.log("KONAMI CODE ACTIVATED!");
        alert("CHEAT ACTIVATED: WAVE 10 + ARSENAL");
        
        // 1. Skip to Wave 10
        if (this.waveManager) {
            this.waveManager.currentWave = 9; // Will start next as 10
            this.waveManager.startNextWave();
        }
        
        // 2. Give UNIQUE Random Weapons (Fill Inventory)
        const allTypes = Object.keys(WeaponConfig).filter(k => k !== 'AMMO');
        // Shuffle
        for (let i = allTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTypes[i], allTypes[j]] = [allTypes[j], allTypes[i]];
        }
        
        // Take first 9 (or fewer if inventory smaller)
        const maxSlots = 9;
        for (let i = 0; i < Math.min(allTypes.length, maxSlots); i++) {
            this.player.addWeapon(allTypes[i]);
            // Force equip to ensure it registers? No, addWeapon works.
        }
        
        // 3. Full Ammo
        this.player.inventory.forEach(w => {
            if (this.player.weaponState[w]) {
                this.player.weaponState[w].reserve = 999;
            }
        });

        // 4. Update UI
        this.renderHotbar();
    }

    startMatch() {
        if (this.mode === 'MP' && this.mpParams.host) {
            this.network.broadcastEvent('start_match', {});
            this.beginGameplay();
        }
    }

    // ... (existing code)

    clearProjectiles() {
        // Remove all projectiles
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
        }
        this.projectiles.length = 0; // Keep reference!
    }

    beginGameplay() {
        this.isInLobby = false;
        this.mpGameParams.started = true;
        
        this.clearProjectiles(); // Safety clear

        document.getElementById('lobby-screen').style.display = 'none';
        // ... (rest of function)
        document.body.requestPointerLock();

        document.getElementById('wave-info').style.display = 'none';
        document.getElementById('wave-progress-container').style.display = 'none';
        document.getElementById('mp-info').style.display = 'block';
    }

    onMPEvent(data) {
        if (data.event === 'start_match') {
            this.beginGameplay();
        }
    }

    // --- MP Host Logic ---
    onMPPlayerJoin(id, data) {
        console.log("Player Joined:", id);
        // Spawn Remote Player
        const rp = new RemotePlayer(this.scene, id, data);
        this.remotePlayers[id] = rp;
        this.updatePlayerCount();

        // Notify UI
        if (this.network.isHost) {
            // Broadcast updated list to everyone (or just send world state which includes active players)
            // The Lobby UI needs names. WorldState currently sends minimal data.
            // Let's add explicit lobby data sync? Or just rely on WorldState for now.
            // For lobby, we need a separate "player list" broadcast provided by NetworkManager potentially.
        }
    }

    onMPPlayerUpdate(id, data) {
        if (!this.mpGameParams.started) return; // Ignore movement in lobby
        if (this.remotePlayers[id]) {
            this.remotePlayers[id].updateState(data);
        }
    }

    onMPPlayerAction(id, data) {
        // Handle shots from others
        console.log("Player Action:", id, data);
    }

    onMPPlayerDisconnect(id) {
        if (this.remotePlayers[id]) {
            this.remotePlayers[id].remove();
            delete this.remotePlayers[id];
        }
        this.updatePlayerCount();
    }

    updatePlayerCount() {
        const count = Object.keys(this.remotePlayers).length + 1; // +1 for self
        document.getElementById('player-count').innerText = count;
    }

    // --- MP Client Logic ---
    onMPWorldUpdate(playersData) {
        // clients receive list of all players { id: { pos, rot, skin... } }
        Object.keys(playersData).forEach(id => {
            if (id === this.network.peer.id) return; // Ignore self

            if (!this.remotePlayers[id]) {
                // New player discovered via world state
                this.remotePlayers[id] = new RemotePlayer(this.scene, id, { skin: playersData[id].skin });
            }
            this.remotePlayers[id].updateState(playersData[id]);
        });

        // Cleanup logged out players
        Object.keys(this.remotePlayers).forEach(id => {
            if (!playersData[id]) {
                this.remotePlayers[id].remove();
                delete this.remotePlayers[id];
            }
        });

        // Update count
        const count = Object.keys(playersData).length;
        document.getElementById('player-count').innerText = count;
    }

    spawnProjectile(projectile) {
        if (!projectile || !projectile.mesh) return;
        // console.log("Spawning Projectile via Game");
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
    }



    // --- TERRAIN HELPER ---
    getTerrainHeight(x, z) {
        if (this.worldGen) {
            return this.worldGen.getHeight(x, z);
        } else if (this.scene.userData.getTerrainHeight) {
            return this.scene.userData.getTerrainHeight(x, z);
        } else {
            return 0; // Default flat
        }
    }

    spawnEnemy(type) {
        if (!type) {
            console.warn("spawnEnemy called with undefined type");
            return;
        }

        const spawnPos2D = Utils.getRandomSpawnPosition(40, 15);
        const position = { 
            x: this.player.position.x + spawnPos2D.x, 
            y: 0, 
            z: this.player.position.z + spawnPos2D.z 
        };

        // Align with terrain
        position.y = this.getTerrainHeight(position.x, position.z);

        let enemy;
        switch (type) {
            case 'MELEE': enemy = new MeleeEnemy(this.scene, position); break;
            case 'RANGED': enemy = new RangedEnemy(this.scene, position, this.projectiles); break; // Pass Game.projectiles directly
            case 'TANK': enemy = new TankEnemy(this.scene, position); break;
            case 'SNIPER': enemy = new SniperEnemy(this.scene, position, this.projectiles); break;
            case 'EXPLOSIVE': enemy = new ExplosiveEnemy(this.scene, position); break;
            case 'LAUNCHER': enemy = new LauncherEnemy(this.scene, position, this.projectiles); break;
            case 'ED209': enemy = new ED209(this.scene, position, this.projectiles); break;
            case 'ATOM': enemy = new AtomBoss(this.scene, this.player, position); break;
            default: 
                console.warn("Unknown enemy type:", type);
                return;
        }

        if (enemy) {
            enemy.isBoss = (type === 'ED209' || type === 'ATOM');
            this.enemies.push(enemy);
        }
    }

    spawnBoss(type) {
        // OVERRIDE FOR BOSS RUSH/SPAWN: Use Fixed Positions if in Boss Rush to avoid overlap
        if (this.mode === 'BOSSRUSH') {
             // Cinematic Span: 50m in front of player start (0, 0, 0)
             const spawnZ = -50;
             const h = this.getTerrainHeight(0, spawnZ);
             
             // Create manually to force position
             console.log(`SPAWNING BOSS ${type} AT FIXED POS (0, ${h}, ${spawnZ})`);
             const pos = new THREE.Vector3(0, h + 2, spawnZ); // +2 for foot clearance
             
             let enemy;
             // Manual switch because spawnEnemy uses random logic we want to bypass
             switch (type) {
                case 'ED209': enemy = new ED209(this.scene, pos, this.projectiles); break;
                case 'ATOM': enemy = new AtomBoss(this.scene, this.player, pos); break;
                default: 
                    // Fallback to normal spawn
                    this.spawnEnemy(type); 
                    return;
             }
             
             if (enemy) {
                 enemy.isBoss = true;
                 this.enemies.push(enemy);
             }
        } else {
             // Normal Spawn
             this.spawnEnemy(type);
        }

        // Optional: Boss UI triggers here if needed
        const sub = document.getElementById('subtitle');
        if (sub) {
            sub.innerText = `WARNING: ${type} DETECTED`;
            sub.style.opacity = 1;
            setTimeout(() => sub.style.opacity = 0, 3000);
        }
    }

    updateHUD() {
        if (!this.player) return;

        // 1. HP Bar
        const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
        const hpBar = document.getElementById('hp-bar-fill');
        const hpText = document.getElementById('hp-display');
        
        if (hpBar) {
            hpBar.style.width = hpPercent + '%';
            // Dynamic Color
            if (hpPercent < 30) {
                hpBar.style.backgroundColor = '#ff0000'; // Critical
                hpBar.style.boxShadow = '0 0 10px #ff0000';
            } else if (hpPercent < 60) {
                hpBar.style.backgroundColor = '#ffaa00'; // Warning
                hpBar.style.boxShadow = 'none';
            } else {
                hpBar.style.backgroundColor = '#00ff00'; // Fine
                hpBar.style.boxShadow = 'none';
            }
        }
        if (hpText) hpText.innerText = Math.ceil(this.player.hp);

        // 2. Ammo UI (Sync continuously for reliability)
        this.player.updateAmmoDisplay(); 
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPaused) return;

        // If in lobby, just render scene (maybe rotating camera?) without updates
        if (this.isInLobby) {
            this.renderer.render(this.scene, this.camera);
            if (this.network) {
                // Keep network alive?
            }
            return;
        }

        const dt = Math.min(this.clock.getDelta(), 0.1); // Clamp dt to prevent huge jumps

        // Allow updates if not paused (Input lock check handled inside entities or ignored)
        if (!this.isPaused) { 
            // Update Entities
            this.player.update(dt);
            
            // Update HUD
            this.updateHUD();

            // MP Sync
            if (this.mode === 'MP' && this.network) {
                // 1. Update Remote Players
                Object.values(this.remotePlayers).forEach(rp => rp.update(dt));

                // 2. Send My State
                // Optimize: Send only at intervals (e.g. 20Hz)
                if (this.network.peerId) { // Wait for ID
                    const myState = {
                        pos: this.player.position,
                        rot: this.player.camera.quaternion,
                        skin: this.player.skinURL
                    };

                    if (this.network.isHost) {
                        // Host loop: Compile state and broadcast
                        const worldState = {};
                        // Add self
                        worldState[this.network.peerId] = myState;
                        // Add others (known from their updates)
                        Object.keys(this.remotePlayers).forEach(id => {
                            worldState[id] = {
                                pos: this.remotePlayers[id].targetPosition,
                                rot: this.remotePlayers[id].targetRotation,
                                skin: this.remotePlayers[id].skin // store skin somewhere?
                            };
                        });
                        this.network.broadcastWorldState(worldState);
                    } else {
                        // Client loop: Send to host
                        this.network.sendClientUpdate(myState);
                    }
                }
            }

            // Update Projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                p.update(dt);
                if (p.shouldRemove) {
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                }
            }

            // Update Enemies (SP & BOSSRUSH)
            if (this.mode === 'SP' || this.mode === 'BOSSRUSH') {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const e = this.enemies[i];
                    e.update(dt, this.player.position);
                    
                    // Only remove if fully dead and animation finished
                    if (e.isDead && e.shouldRemove) {
                        this.scene.remove(e.mesh);
                        this.enemies.splice(i, 1);
                        this.player.score += 100;
                        
                        // Drop Logic (Boosted to 50% Chance)
                        if (Math.random() < 0.5) { 
                            const type = this.getWeightedRandomDrop();
                            if (type) {
                                this.spawnPickup(e.mesh.position, type);
                            }
                        }
                    }
                }
            }

            // Update Pickups
            for (let i = this.pickups.length - 1; i >= 0; i--) {
                const p = this.pickups[i];
                if (p.update(dt, this.player.position)) {
                    // Picked up
                    if (p.type === 'AMMO') {
                        // Restore ammo for ALL weapons or Current?
                        // Let's restore for ALL carried weapons by a percentage or fixed amount
                        this.player.addAmmoToAll(0.3); // 30% refill
                        // Feedback
                        this.createFloatingText(this.player.position, "+AMMO", "#0f0");
                    } else {
                        this.player.addWeapon(p.type);
                        this.createFloatingText(this.player.position, "NEW WEAPON", "#ff0");
                    }
                    this.scene.remove(p.mesh);
                    this.pickups.splice(i, 1);
                }
            }

            // Update Systems
            if (this.waveManager) this.waveManager.update(dt);
            if (this.collision) this.collision.update(dt);
            this.particleSystem.update(dt);
            
            // Star rotation
            if (this.stars) {
                this.stars.rotation.y += dt * 0.02; // Slow spin
            }

            // UI Updates
            this.renderHotbar(); // Keep hotbar synced
            // UI Updates
            this.renderHotbar(); // Keep hotbar synced
            
            // Score Update
            document.getElementById('score-display').innerText = this.player.score;
            
            // Score Update
            document.getElementById('score-display').innerText = this.player.score;
        }

        this.renderer.render(this.scene, this.camera);

        // Render Preview if Inventory Open
        if (this.isPreviewActive && !this.input.isLocked) { // Not locked = menu open roughly
        // Check if inv menu OR upgrade menu is actually visible
             const invMenu = document.getElementById('inventory-menu');
             const upgradeMenu = document.getElementById('upgrade-screen');
             
             const showPreview = (invMenu && invMenu.style.display !== 'none') || (upgradeMenu && upgradeMenu.style.display !== 'none');

             if (showPreview) {
             if (showPreview) {
                 if (this.previewCharacter) {
                     this.previewCharacter.mesh.rotation.y += 0.01;
                     // Ensure update is called if needed for animation/lerping
                     // this.previewCharacter.update(0.016); 
                 }
                 if (this.previewApp) {
                     this.previewApp.renderer.render(this.previewApp.scene, this.previewApp.camera);
                 }
             }
             }
        }
    }



    showUpgradeScreen() {
        this.isPaused = true;
        document.exitPointerLock();
        this.input.keys.attack = false; // Stop shooting
        
        // WAVE COMPLETE HEAL
        const healAmount = Math.floor(this.player.maxHp * 0.5);
        const oldHp = this.player.hp;
        this.player.hp = Math.min(this.player.hp + healAmount, this.player.maxHp);
        const healed = Math.floor(this.player.hp - oldHp);
        
        if (healed > 0) {
            this.player.createFloatingText(this.player.position, `WAVE CLEARED: +${healed} HP`, "#00ff00");
        }
        
        // Update HP
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        const hpBar = document.getElementById('hp-bar-fill');
        const hpText = document.getElementById('hp-display');
        
        hpBar.style.width = hpPercent + '%';
        hpText.innerText = Math.ceil(this.player.hp);

        // Dynamic Color
        if (hpPercent < 30) {
            hpBar.style.backgroundColor = '#ff0000'; // Critical
            hpBar.style.boxShadow = '0 0 10px #ff0000';
            // Scale effect?
            hpBar.style.height = '100%'; 
        } else if (hpPercent < 60) {
            hpBar.style.backgroundColor = '#ffaa00'; // Warning
            hpBar.style.boxShadow = 'none';
        } else {
            hpBar.style.backgroundColor = '#00ff00'; // Fine
            hpBar.style.boxShadow = 'none';
        }
        
        const upgradeScreen = document.getElementById('upgrade-screen');
        if (upgradeScreen) {
             upgradeScreen.style.display = 'flex';
             if (this.upgradeManager) {
                 this.upgradeManager.showUpgrades();
             }
        }
    }

    createSky() {
        // Gradient Sky Sphere
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `;
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize( vWorldPosition + offset ).y;
                gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 );
            }
        `;

        const uniforms = {
            topColor: { value: new THREE.Color(0x5599ff) }, // Bright Blue
            bottomColor: { value: new THREE.Color(0xffaa66) }, // Orange/Dust Horizon
            offset: { value: 33 },
            exponent: { value: 0.6 }
        };

        const skyGeo = new THREE.SphereGeometry(600, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: uniforms,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // Fog (Dusty Haze)
        this.scene.fog = new THREE.FogExp2(0xddccaa, 0.015);

        // Sun Light
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(100, 200, 50);
        sun.castShadow = true;
        this.scene.add(sun);
        
        // Ambient Light (Warm)
        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x444444, 0.6);
        this.scene.add(hemiLight);

        // Stars (Visible only high up or faint?) 
        // Let's remove stars for day time or make them very faint
        // or replace with "Dust Motes"
        const starGeo = new THREE.BufferGeometry();
        const starCount = 500;
        const starPos = new Float32Array(starCount * 3);
        
        for(let i=0; i<starCount * 3; i+=3) {
            const r = 400; // Distance
            // Random spherical coordinates, but keep Y positive
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(1 - Math.random()); // Hemisphere
            
            starPos[i] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i+1] = Math.abs(r * Math.cos(phi)) + 10; // Ensure Above Horizon + offset
            starPos[i+2] = r * Math.sin(phi) * Math.sin(theta);
        }
        
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.8 });
        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }
    
    createFloatingText(position, text, color) {
        const div = document.createElement('div');
        div.className = 'floating-text';
        div.innerText = text;
        div.style.color = color;
        div.style.position = 'absolute';
        div.style.fontWeight = 'bold';
        div.style.pointerEvents = 'none';
        div.style.textShadow = '1px 1px 0 #000';
        document.body.appendChild(div);

        // Project position
        const updatePos = () => {
            const vector = position.clone();
            vector.y += 1.0; // Above item
            vector.project(this.camera);

            const x = (vector.x * .5 + .5) * window.innerWidth;
            const y = (-(vector.y * .5) + .5) * window.innerHeight;

            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.opacity = parseFloat(div.style.opacity || 1) - 0.01;
            
            // Remove check
            if (parseFloat(div.style.opacity) <= 0) {
                div.remove();
                return;
            }
            requestAnimationFrame(updatePos);
        };
        
        div.style.opacity = '1.0';
        updatePos();
        
        // Timeout backup
        setTimeout(() => div.remove(), 1000);
    }

    // --- BOSS RUSH LOGIC ---
    startBossMatch(loadout) {
        console.log("GAME: Starting Boss Match with Loadout:", loadout);
        
        // 1. Equip Weapons
        this.player.inventory = [];
        this.player.currentSlot = 0;
        
        // Ensure Player has pickup method OR manually add to inventory
        // Assuming Player.addItem(type) or direct inject
        loadout.forEach(type => {
             // Mock pickup
             if (!this.player.inventory.includes(type)) {
                 this.player.inventory.push(type);
             }
        });
        
        // If empty, give default
        if (this.player.inventory.length === 0) this.player.inventory.push('Pistol');
        
        this.player.switchWeapon(0);

        // 2. Unpause and Lock Mouse
        this.isPaused = false;
        document.body.requestPointerLock();
        
        // 3. Spawn Boss (Manual Queue for now)
        this.spawnBossQueue();
    }

    spawnBossQueue() {
        // Start with ED209
        console.log("GAME: Spawning Boss ED209");
        this.spawnEnemy('ED209');
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
