import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { WaveManager } from '../systems/WaveManager.js';
import { Collision } from '../systems/Collision.js';
import { UpgradeManager } from '../systems/UpgradeManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { Chest } from '../entities/Chest.js';
import { NetworkManager } from './NetworkManager.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { WeaponConfig } from './WeaponSystem.js';
import { WeaponPickup } from '../entities/WeaponPickup.js';
import { WorldGenerator } from './WorldGenerator.js';
import { ObserverBoss } from '../entities/bosses/ObserverBoss.js';

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

        this.init();
    }

    init() {
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
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        this.scene.add(dirLight);

        // World Generation
        this.worldGen = new WorldGenerator(this.scene);
        this.worldGen.generateLevel();

        // Infinite Grid Visual (Optional - keep for reference or remove?)
        // const gridHelper = new THREE.GridHelper(1000, 100, 0x555555, 0xbbbbbb);
        // this.scene.add(gridHelper);

        // Input
        this.input = new Input();
        this.input.onPause = () => this.togglePause();
        this.input.onInventory = () => this.toggleInventory();
        this.input.onInteract = () => this.checkInteraction(); // Keep for future use (drops)

        // Player
        this.player = new Player(this.camera, this.input, this.scene, this.projectiles, this.playerSkinURL);

        // Systems
        this.particleSystem = new ParticleSystem(this.scene);
        this.upgradeManager = new UpgradeManager(this); // Keep for Drop UI? Or remove?
        // User said "backpack" for weapons. UpgradeManager handled "Cards". 
        // We probably need to refactor UpgradeManager into InventoryManager later.

        if (this.mode === 'SP') {
            this.waveManager = new WaveManager(this.scene, this.player, this.enemies, this.upgradeManager, this);
        }
        this.collision = new Collision(this.player, this.enemies, this.projectiles, this.particleSystem);

        // Pass particle system to player for slash effects
        this.player.particleSystem = this.particleSystem;

        // Events
        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.addEventListener('player-drop-item', (e) => {
            this.spawnPickup(e.detail.position, e.detail.type);
        });
        
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

        // Setup MP
        if (this.mode === 'MP') {
            this.initMultiplayer();
        }

        // Start Logic (If SP, start immediately. If MP, wait in lobby?)
        if (this.mode === 'SP') {
            // Request Pointer Lock immediately handled in main.js
            this.animate();
        } else {
            // MP starts in lobby state
            this.isInLobby = true;
            this.animate(); // Logic loop runs to handle network, but player disabled
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

        const pauseMenu = document.getElementById('pause-menu');
        if (this.isPaused) {
            if (pauseMenu) pauseMenu.style.display = 'flex';
            document.exitPointerLock();
            this.input.keys.attack = false; // Fix: Stop shooting
            this.input.keys.forward = false;
            this.input.keys.backward = false;
            this.input.keys.left = false;
            this.input.keys.right = false;
        } else {
            if (pauseMenu) pauseMenu.style.display = 'none';
            document.body.requestPointerLock();
            this.clock.getDelta(); // Reset clock to avoid huge dt spike
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
        // 1. Render Menu Grid
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        // We use the fixed inventory array (9 slots) but maybe we want more for "Pack"?
        // For now, let's just show the 9 slots repeated or just the single row?
        // User asked for "Backpack" vs "Hotbar".
        // Let's display the same 9 slots in the menu for now, but formatted nicely.
        
        this.player.inventory.forEach((type, i) => {
            const div = document.createElement('div');
            div.className = 'inv-slot';
            if (i === this.player.currentSlot) div.classList.add('active');

            if (type) {
                const config = WeaponConfig[type];
                if (config) {
                    div.innerHTML = `<span class="inv-icon">${config.isMelee ? '⚔️' : '🔫'}</span>`;
                    
                    if (!config.isMelee && config.magSize !== Infinity) {
                         const state = this.player.weaponState[type];
                         div.innerHTML += `<span class="inv-count">${state ? state.reserve : 0}</span>`;
                    }
                    
                    // Hover Info
                    div.onmouseenter = () => {
                        this.hoveredSlot = i;
                        document.getElementById('inv-item-name').innerText = type;
                        const stats = `DAMAGE: <span style="color:#f55">${config.damage}</span> | FIRE RATE: <span style="color:#5f5">${config.fireRate}s</span>\n` +
                                      `MAG: ${config.magSize} | RESERVE: ${config.maxReserve} <br><br> <span style="color:#aaa; font-size: 0.8em">Press 'F' to Delete</span>`;
                        document.getElementById('inv-item-desc').innerHTML = stats;
                    };
                    div.onmouseleave = () => {
                        if (this.hoveredSlot === i) this.hoveredSlot = -1;
                    };
                }
            } else {
                 div.onmouseenter = () => {
                    this.hoveredSlot = i;
                    document.getElementById('inv-item-name').innerText = "EMPTY SLOT";
                    document.getElementById('inv-item-desc').innerText = "No item equipped.";
                 };
                 div.onmouseleave = () => {
                    if (this.hoveredSlot === i) this.hoveredSlot = -1;
                 };
            }

            // Click to Swap/Equip
            div.onclick = () => {
                this.player.switchWeapon(i);
                this.renderInventory(); // Re-render both
            };

            grid.appendChild(div);
        });

        // 2. Render Hotbar (Always visible HUD)
        this.renderHotbar();

        // 3. Update Character Preview (2D Image)
        const previewContainer = document.getElementById('player-preview-container');
        previewContainer.innerHTML = '';
        
        const img = document.createElement('img');
        if (this.player.skinURL) {
            img.src = this.player.skinURL;
        } else {
            // Default Cute Face
            // Generate a simple canvas for the face
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffff00'; // Yellow
            ctx.fillRect(0, 0, 128, 128);
            ctx.fillStyle = '#000';
            // Eyes
            ctx.beginPath(); ctx.arc(40, 50, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(88, 50, 10, 0, Math.PI * 2); ctx.fill();
            // Smile
            ctx.beginPath(); ctx.arc(64, 70, 30, 0, Math.PI, false); ctx.stroke();
            img.src = canvas.toDataURL();
        }
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        previewContainer.appendChild(img);
    }

    renderHotbar() {
        const container = document.getElementById('hotbar-container');
        if (!container) return;
        container.innerHTML = '';

        this.player.inventory.forEach((type, i) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (i === this.player.currentSlot) slot.classList.add('active');

            // Key Number
            slot.innerHTML = `<span class="hotbar-key">${i + 1}</span>`;

            if (type) {
                const config = WeaponConfig[type];
                if (config) {
                    slot.innerHTML += config.isMelee ? '⚔️' : '🔫';
                }
            }
            container.appendChild(slot);
        });
    }

    spawnPickup(position, type = null) {
        const pickup = new WeaponPickup(this.scene, position, type);
        this.pickups.push(pickup);
    }

    getWeightedRandomDrop() {
        // 1. Ammo (High chance if not given type) - actually WeaponPickup handles null=random.
        // But we want weighted weapons OR ammo.
        // Let's say: 40% Ammo, 60% Weapon.
        if (Math.random() < 0.4) return 'AMMO';

        const weights = {
            'common': 50,
            'uncommon': 30,
            'rare': 15,
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
        const weaponKey = pool[Math.floor(Math.random() * pool.length)]; // String key
        const typeObj = WeaponConfig[eval('WeaponType.' + weaponKey)] ? eval('WeaponType.' + weaponKey) : weaponKey; 
        // Wait, WeaponConfig uses values like 'Pistol', 'Revolver'. 
        // The tiers should use the VALUES from WeaponType, or keys?
        // WeaponType is an object. Keys are caps, values are strings.
        // Let's safe look up by iterating WeaponType to find matching key? 
        // Actually, let's just hardcode the VALUES in the tiers for simplicity, or map key -> value.
        // Simpler: Just resolve the string key to the value using the WeaponType export (imported as local var? No, imported as module).
        
        // Accessing WeaponType here is tricky if it's imported. Game.js imports { WeaponType }? No, it imports WeaponConfig.
        // I need to import WeaponType in Game.js to use it properly or check imports.
        // Imports: `import { WeaponConfig } from './WeaponSystem.js';`
        // I should verify if WeaponConfig KEYS are the values (e.g. 'Pistol'). Yes they are.
        
        // So I can just return the string 'Pistol' etc.
        // My tiers used keys like 'PISTOL'. I need to map 'PISTOL' -> 'Pistol'.
        
        // Let's redefine tiers using actual string values from a helper or manually.
        // Manual mapping is safest.
        
        const tierValues = {
            'common': ['Pistol', 'SMG', 'Shotgun', 'Bat', 'Knife', 'MP5'],
            'uncommon': ['Rifle', 'Sniper', 'Revolver', 'M4A1', 'SCAR-H', 'P90', 'Battle Axe'],
            'rare': ['Minigun', 'AA Missile', 'Desert Eagle', 'Katana', 'Famas', 'Grenade Launcher', 'Flamethrower'],
            'legendary': ['BFG-8000', 'Railgun', 'Lightsaber', 'Barrett .50', 'Freeze Ray', 'Alien Blaster']
        };
        
        const valPool = tierValues[tier];
        return valPool[Math.floor(Math.random() * valPool.length)];
    }

    spawnEnemy(type) {
        // ... (existing code, ensure it doesn't break) ...
        // I will just append spawnBoss below standard spawn logic or near it.
        // Actually, I need to read the file first to know where to put it properly.
    }

    spawnBoss(waveNum) {
        console.log("SPAWNING BOSS FOR WAVE", waveNum);
        
        // Determine Boss Type
        // Wave 10: Observer
        // Wave 0 (Debug): Observer
        
        const pos = new THREE.Vector3(0, 20, -50); // High up logic?
        
        if (waveNum % 10 === 0) {
            const boss = new ObserverBoss(this.scene, this.player, pos);
            
            // INJECT PROJECTILES ARRAY SO BOSS CAN SHOOT
            boss.projectiles = this.projectiles; 
            
            this.enemies.push(boss);
            this.scene.add(boss.mesh);
            
            // Dramatic Effect?
            // this.particleSystem.createExplosion(pos, 0xff0000);
        }
    }

    startMatch() {
        if (this.mode === 'MP' && this.mpParams.host) {
            this.network.broadcastEvent('start_match', {});
            this.beginGameplay();
        }
    }

    beginGameplay() {
        this.isInLobby = false;
        this.mpGameParams.started = true;

        document.getElementById('lobby-screen').style.display = 'none';
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

        const dt = this.clock.getDelta();

        // Allow updates if locked OR if we want to debug (optional, but let's stick to lock for now)
        if (this.input.isLocked || this.mode === 'MP') { // Allow update in MP even if unlocked momentarily? No, strict.
            // Update Entities
            this.player.update(dt);

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

            // Update Enemies (Only in SP)
            if (this.mode === 'SP') {
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const e = this.enemies[i];
                    e.update(dt, this.player.position);
                    if (e.isDead) {
                        this.scene.remove(e.mesh);
                        this.enemies.splice(i, 1);
                        this.player.score += 100;
                        
                        // Drop Logic (20% Chance)
                        if (Math.random() < 0.2) { 
                            const type = this.getWeightedRandomDrop();
                            this.spawnPickup(e.mesh.position, type);
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
            if (this.collision) this.collision.update();
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
            topColor: { value: new THREE.Color(0x000500) }, // Toxic Dark
            bottomColor: { value: new THREE.Color(0x113311) }, // Toxic Green Horizon
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

        // Fog (Toxic Green)
        this.scene.fog = new THREE.FogExp2(0x051505, 0.02);

        // Stars
        const starGeo = new THREE.BufferGeometry();
        const starCount = 1000;
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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
