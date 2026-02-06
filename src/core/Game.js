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
import { LevelManager } from '../systems/LevelManager.js';
import { EntityManager } from '../systems/EntityManager.js';
import { CinematicManager } from '../systems/CinematicManager.js';
// ...
import { WeaponConfig } from './WeaponSystem.js';
import { WeaponPickup } from '../entities/WeaponPickup.js';
import { WorldGenerator } from './WorldGenerator.js';
import { ArsenalMenu } from '../ui/ArsenalMenu.js';
// Dev Console
import { DevConsole } from './DevConsole.js';
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
        
        // Systems
        this.levelManager = new LevelManager(this);
        this.entityManager = new EntityManager(this);
        this.cinematicManager = new CinematicManager(this);
        
        // Proxy enemies array for other systems (WaveManager, Collision) that might read it
        // A getter would be cleaner, but for compatibility let's reference the manager's array
        // NOTE: We cannot simply assign this.enemies = this.entityManager.enemies here because 
        // EntityManager constructor might have set it to [] and we want to keep the reference sync.
        // Actually, just using a getter is safer.
        
        this.init();
    }
    
    // Compatibility Getter
    get enemies() {
        return this.entityManager ? this.entityManager.enemies : [];
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

        // Fog for Infinite Horizon (Matches ground color 0x8b5a2b)
        // Density 0.0008 allows visibility up to ~1200 units, hiding the 2500 unit edge
        this.scene.fog = new THREE.FogExp2(0x8b5a2b, 0.0008); 

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(0x8b5a2b); // Maintain background color match
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.sunLight = dirLight; // Expose for levels
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
            
            // QUICK START OPTION (For Testing)
            // Respect passed options
            if (this.mpParams && this.mpParams.skipIntro) {
                this.SKIP_INTRO = true;
            } else {
                this.SKIP_INTRO = true; // Default to true for now as favored by user? Or keep hardcoded?
                // Revert hardcode if we want flags to matter
                // For now, let's say default is TRUE unless specified? 
                // Actually user requested -skip flag implies default is FALSE/Normal?
                // Current code had this.SKIP_INTRO = true hardcoded.
                // Let's keep it true for development convenience unless explicitly false?
                // No, better to default to FALSE for production feel, but TRUE for dev.
                // Let's rely on the flag.
                // If flag is passed, use it. If not, default to true for now to annoy user less.
            }
            
            // Actually, let's make it cleaner:
            this.SKIP_INTRO = (this.mpParams && this.mpParams.skipIntro) || true; // Default TRUE for this session
            
            if (this.SKIP_INTRO) {
                this.spawnPoint = new THREE.Vector3(0, startH + 5, 0); // Ground Spawn
                this.deployState = { active: false, stage: 4 }; // Skip drop seq
            } else {
                this.spawnPoint = new THREE.Vector3(0, startH + 2000, 0); // Orbital Drop
                this.deployState = { active: true, stage: 0 };
            }
        }

        // Input
        this.input = new Input();
        this.input.onPause = () => this.togglePause();
        this.input.onPause = () => this.togglePause();
        // this.input.onInventory = () => this.toggleInventory(); // DISABLED per user request
        this.input.onInteract = () => this.checkInteraction(); 
        this.input.onInteract = () => this.checkInteraction(); 
        
        // Player Action Bindings
        this.input.onAttack = () => { /* Attack handled in update loop */ };
        this.input.onReload = () => { 
            console.log(`GAME: RELOAD KEY PRESSED. Paused: ${this.isPaused}, Mode: ${this.mode}`); 
            
            // strictly block if paused?
            if (this.isPaused) {
                console.log("GAME: Reload ignored because Game is PAUSED.");
                return;
            }

            if (this.player) {
                console.log("GAME: calling player.reload()");
                this.player.reload(); 
            } else {
                console.error("GAME: Player is NULL");
            }
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
        this.scene.userData.particleSystem = this.particleSystem; // Expose to entities
        this.upgradeManager = new UpgradeManager(this);
        
        if (this.mode === 'SP') {
            this.waveManager = new WaveManager(this.scene, this.player, this.enemies, this.upgradeManager, this);
        } else if (this.mode === 'BOSSRUSH') {
            // No wave manager initially. 
            // We manage flow manually or via ArenaLevel logic later.
        }
        
        this.collision = new Collision(this.player, this.enemies, this.projectiles, this.particleSystem);
        
        // Dev Console
        this.devConsole = new DevConsole(this);

        // Pass particle system to player for slash effects
        this.player.particleSystem = this.particleSystem;

        // Events
        this._onResize = () => this.onWindowResize();
        this._onDropItem = (e) => this.spawnPickup(e.detail.position, e.detail.type, 2.0);
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
        
        document.addEventListener('boss-defeated', (e) => this.triggerReflectiveCutscene(e));

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
            "atom": () => this.spawnBoss(10), 
            "space": () => this.loadLevel('SPACE'),
            "castle": () => this.loadLevel('CASTLE'),
            "minigun": () => { 
                this.player.addWeapon('Minigun'); 
                const idx = this.player.weaponSystem.inventory.indexOf('Minigun');
                if (idx !== -1) this.player.switchWeapon(idx);
            },
            "wave": (n) => { 
                if (this.waveManager) {
                    const wave = n ? parseInt(n) : 1;
                    if (!isNaN(wave)) {
                        this.waveManager.currentWave = wave - 1; 
                        this.waveManager.startNextWave(); 
                        console.log(`CHEAT: JUMPING TO WAVE ${wave}`);
                    }
                }
            },
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
            
            // Reset clock safely
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

    spawnPickup(position, type = null, cooldown = 0) {
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

        const pickup = new WeaponPickup(this.scene, position, type, cooldown);
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

    // spawnBoss moved to lower section to avoid duplication
    // (Merged with spawnBoss(type))

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

    spawnRandomDrop(position) {
         const type = this.getWeightedRandomDrop();
         if (type) {
             this.spawnPickup(position, type);
         }
    }

    getWeightedRandomDrop() {
        const r = Math.random();
        // 40% Ammo, 20% Health (if we had it), 10% Weapon?
        // Current logic:
        if (r < 0.4) return 'AMMO';
        // Weapon drops?
        // Let's return null mostly
        return 'AMMO'; // Simplification for now, can expand
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
        if (this.entityManager) {
            this.entityManager.spawnEnemy(type);
        }
    }

    spawnBoss(identifier) {
        if (this.entityManager) {
            this.entityManager.spawnBoss(identifier);
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
            
            // Orbital Drop Logic (Cinematic)
            if (this.deployState && this.deployState.active) {
                // Lock horizontal
                this.player.velocity.x = 0;
                this.player.velocity.z = 0;

                const h = this.player.position.y;
                
                // --- Sky & Atmosphere Physics ---
                if (this.skyUniforms && this.stars) {
                    if (h > 1000) {
                        // SPACE: Black Sky, Stars Visible, No Fog
                        this.skyUniforms.topColor.value.setHex(0x000000);
                        this.skyUniforms.bottomColor.value.setHex(0x000510);
                        this.stars.material.opacity = 0.9;
                        this.scene.fog.color.setHex(0x000000);
                        this.scene.fog.density = 0.0001;
                    } else if (h > 400) {
                        // RE-ENTRY: Red/Orange Glow, Shake
                        const t = (h - 400) / 600; // 0 to 1
                        this.skyUniforms.topColor.value.lerp(new THREE.Color(0x330000), 1-t);
                        this.skyUniforms.bottomColor.value.lerp(new THREE.Color(0xff4400), 1-t);
                        this.stars.material.opacity = t; // Fade stars
                        this.scene.fog.color.lerp(new THREE.Color(0xff4400), 1-t);
                        this.scene.fog.density = 0.002 + (1-t)*0.01;
                        
                        // Violent Shake
                        this.player.shakeIntensity = 0.2 + (1-t) * 0.5;
                        this.player.shakeTime = 0.1;

                        // Re-entry Particles (Simple sparks)
                        if (Math.random() < 0.3) {
                            const offset = new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5);
                            const pos = this.player.position.clone().add(offset);
                            this.particleSystem.createExplosion(pos, 0xffaa00, 1); // Reuse explosion as sparks
                        }
                    } else {
                        // TROPOSPHERE: Fade to Day
                        const t = Math.max(0, h / 400); // 0 to 1
                        this.skyUniforms.topColor.value.lerp(new THREE.Color(0x5599ff), 1-t);
                        this.skyUniforms.bottomColor.value.lerp(new THREE.Color(0xffaa66), 1-t);
                        this.scene.fog.color.lerp(new THREE.Color(0xddccaa), 1-t); // Dust color
                        this.scene.fog.density = 0.015 * (1-t);
                        
                        this.player.shakeIntensity = 0.1 * t;
                    }
                }

                // HUD Updates based on altitude
                if (h < 1800 && this.deployState.stage === 0) {
                     this.updateMissionOverlay("INITIATING REENTRY", "#ff0000");
                     this.deployState.stage = 1;
                }
                if (h < 1000 && this.deployState.stage === 1) {
                     this.updateMissionOverlay("MISSION: KILL ALL MACHINES", "#ff4400");
                     this.deployState.stage = 2;
                }
                if (h < 400 && this.deployState.stage === 2) {
                     this.updateMissionOverlay("ACHIEVE THE CORE", "#00ff00");
                     this.deployState.stage = 3;
                }
                
                // Re-entry Spark Generation (More frequent & Visible)
                if (this.deployState.stage >= 1 && h > 400) {
                    if (Math.random() < 0.8) { 
                        // Spawn in FRONT of player camera
                        const camDir = new THREE.Vector3();
                        this.camera.getWorldDirection(camDir);
                        const offset = camDir.multiplyScalar(5).add(
                            new THREE.Vector3((Math.random()-0.5)*10, (Math.random()-0.5)*10, (Math.random()-0.5)*10)
                        );
                        const pos = this.player.position.clone().add(offset);
                        if (this.particleSystem && this.particleSystem.createExplosion) {
                             this.particleSystem.createExplosion(pos, 0xff4400, 3); 
                        }
                    }
                }
                
                // Check Landing
                // Check Landing (Tunneling Protection)
                const groundH = this.worldGen ? this.worldGen.getHeight(this.player.position.x, this.player.position.z) : 0;
                
                // If we are near ground OR passed through it
                if (h <= groundH + 5) { 
                     this.deployState.active = false;
                     this.player.position.y = groundH + 2; // Snap to surface
                     this.player.velocity.y = 0;
                     
                     this.updateMissionOverlay("TOUCHDOWN", "#00ffff");
                     this.player.shakeTime = 1.0;
                     this.player.shakeIntensity = 1.0;
                     
                     // Fade out overlay
                     setTimeout(() => { 
                        const el = document.getElementById('mission-overlay');
                        if(el) el.style.opacity = 0; 
                     }, 3000);
                     
                     // Big Impact Dust
                     this.particleSystem.createExplosion(this.player.position, 0x887766, 50);
                }
            }
            
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
                // Get terrain height for this projectile
                let groundY = 0;
                if (this.getTerrainHeight) {
                    groundY = this.getTerrainHeight(p.mesh.position.x, p.mesh.position.z);
                }
                
                p.update(dt, groundY);
                if (p.shouldRemove) {
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                }
            }

            // Update Systems
            if (this.entityManager) this.entityManager.update(dt);
            if (this.waveManager) this.waveManager.update(dt);
            if (this.collision) this.collision.update(dt);
            this.particleSystem.update(dt);

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

        const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
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
            const r = 3500; // Distance
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
    
    updateMissionOverlay(text, color) {
        const el = document.getElementById('mission-overlay');
        if (el) {
            el.innerText = text;
            el.style.color = color;
            el.style.opacity = 1;
            el.style.textShadow = `0 0 20px ${color}`;
        }
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
        this.spawnBoss('ED209');
    }

    loadLevel(levelName) {
        if (this.levelManager) {
            this.levelManager.loadLevel(levelName);
        } else {
            console.error("Game.js: LevelManager not initialized");
        }
    }

    update(dt) {
         // Level Update
         if (this.levelManager) this.levelManager.update(dt);
         
         // Old Level Specific Update (Deprecated but keeping for safety if not fully migrated)
         if (this.currentLevel && this.currentLevel.update) {
             this.currentLevel.update(dt);
         }

         if (this.mode === 'SPACE_FLIGHT') {
             this.renderer.render(this.scene, this.camera);
             return; 
         }
         
         // Main Game Update (Existing)
         // ...
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Helper for Entities
    getTerrainHeight(x, z) {
        if (this.worldGen && this.worldGen.getHeight) {
            return this.worldGen.getHeight(x, z);
        }
        return 0;
    }

    triggerReflectiveCutscene(e) {
        // Trigger Flash
        setTimeout(() => flash.style.opacity = '1', 50);

        // 2. CINEMATIC OVERLAY (The Debris Scene)
        const cinematic = document.createElement('div');
        cinematic.id = 'cinematic-overlay';
        Object.assign(cinematic.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'black', zIndex: '9998', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', opacity: '0', transition: 'opacity 2s'
        });
        
        // BETTER ART: Scattered Debris
        cinematic.innerHTML = `
            <div style="width: 100%; height: 100%; position: relative; overflow: hidden; background: radial-gradient(circle at center, #330000, #000000);">
                <!-- Burning Ground -->
                <div style="position: absolute; bottom: 0; width: 100%; height: 40%; background: linear-gradient(to top, #220000, transparent);"></div>
                
                <!-- Debris Field (SVG for better shapes) -->
                <svg width="100%" height="100%" style="position: absolute; top:0; left:0;">
                    <!-- Crater -->
                    <ellipse cx="50%" cy="80%" rx="400" ry="100" fill="#110505" />
                    
                    <!-- Robot Leg (Torn) -->
                    <path d="M 400 600 L 450 500 L 500 520 L 480 620 Z" fill="#222" stroke="#444" stroke-width="2" />
                    
                    <!-- Twisted Metal -->
                    <path d="M 800 650 Q 850 500 900 680" stroke="#555" stroke-width="5" fill="none" />
                    <rect x="600" y="550" width="100" height="60" fill="#333" transform="rotate(15)" />
                    
                    <!-- Sparks (CSS Animation classes could go here) -->
                    <circle cx="450" cy="500" r="2" fill="orange" />
                    <circle cx="620" cy="540" r="3" fill="yellow" />
                </svg>

                <!-- Cinematic Text (Legible) -->
                <div style="position: absolute; bottom: 10%; width: 100%; text-align: center;">
                     <div id="cine-text" style="
                        font-family: 'Courier New', monospace; 
                        font-size: 32px; 
                        color: #00ff00; 
                        background: rgba(0,0,0,0.8); 
                        display: inline-block; 
                        padding: 10px 20px; 
                        border: 1px solid #00ff00;
                        text-shadow: 0 0 10px #00ff00;">
                        NUCLEAR THREAT NEUTRALIZED
                     </div>
                </div>
            </div>
        `;
        document.body.appendChild(cinematic);

        // SEQUENCE
        // 0s: Flash White
        // 1.5s: Fade Flash -> Show Cinematic
        setTimeout(() => {
            flash.style.opacity = '0';
            cinematic.style.opacity = '1';
        }, 1500);

        // 4s: Update Text
        setTimeout(() => {
             const txt = document.getElementById('cine-text');
             if(txt) txt.innerText = "COORDINATES ACQUIRED: THE CITADEL";
        }, 4000);

        // 8s: Transition
        setTimeout(() => {
             document.body.removeChild(flash);
             document.body.removeChild(cinematic);
             this.loadLevel('CASTLE');
        }, 8000);
    }



    showReflectiveDialogue() {
        // Simple HTML overlay
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.bottom = '20%';
        container.style.width = '100%';
        container.style.textAlign = 'center';
        container.style.color = '#fff';
        container.style.fontFamily = "'Courier New', monospace";
        container.style.fontSize = '24px';
        container.style.textShadow = '0 0 10px #000';
        container.style.opacity = '0';
        container.style.transition = 'opacity 2s';
        document.body.appendChild(container);

        const lines = [
            "Systems critical...",
            "Threat neutralized.",
            "But at what cost?",
            "..."
        ];

        let index = 0;
        const showLine = () => {
            if (index >= lines.length) {
                // End
                setTimeout(() => {
                    container.style.opacity = 0;
                    setTimeout(() => {
                        container.remove();
                        // Return to menu or continue?
                        // Let's continue for now or end demo.
                        alert("MISSION ACCOMPLISHED. RETURNING TO BASE.");
                        location.reload(); 
                    }, 2000);
                }, 3000);
                return;
            }

            container.innerText = lines[index];
            container.style.opacity = 1;
            
            setTimeout(() => {
                container.style.opacity = 0;
                setTimeout(() => {
                    index++;
                    showLine();
                }, 1000);
            }, 3000);
        };
        
        setTimeout(showLine, 1000);
    }
}
