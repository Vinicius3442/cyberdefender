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
        const textureLoader = new THREE.TextureLoader();

        // Skybox / Background
        textureLoader.load('./assets/sky.png',
            (texture) => {
                this.scene.background = texture;
                this.scene.fog = new THREE.FogExp2(0x050000, 0.02); // Fog matches dark theme
            },
            undefined,
            () => {
                this.scene.background = new THREE.Color(0x050000); // Fallback
                this.scene.fog = new THREE.Fog(0x050000, 10, 50);
            }
        );

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

        // Floor
        const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
        const floorTexture = textureLoader.load('./assets/floor.png');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(100, 100);

        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.8,
            color: 0x888888 // Tint
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);

        // Input
        this.input = new Input();
        this.input.onPause = () => this.togglePause();
        this.input.onInteract = () => this.checkInteraction();

        // Player
        this.player = new Player(this.camera, this.input, this.scene, this.projectiles, this.playerSkinURL);

        // Systems
        this.particleSystem = new ParticleSystem(this.scene);
        this.upgradeManager = new UpgradeManager(this);
        if (this.mode === 'SP') {
            this.waveManager = new WaveManager(this.scene, this.player, this.enemies, this.upgradeManager, this);
        }
        this.collision = new Collision(this.player, this.enemies, this.projectiles, this.particleSystem);

        // Pass particle system to player for slash effects
        this.player.particleSystem = this.particleSystem;

        // Events
        window.addEventListener('resize', () => this.onWindowResize(), false);

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
                        // Maybe score update here
                    }
                }
            }

            // Update Systems
            if (this.waveManager) this.waveManager.update(dt);
            if (this.collision) this.collision.update();
            this.particleSystem.update(dt);

            // Update Chests
            for (let i = this.chests.length - 1; i >= 0; i--) {
                const chest = this.chests[i];
                chest.update(dt);
                if (chest.shouldRemove) {
                    this.scene.remove(chest.mesh);
                    this.chests.splice(i, 1);
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
