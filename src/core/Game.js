import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { WaveManager } from '../systems/WaveManager.js';
import { Collision } from '../systems/Collision.js';
import { UpgradeManager } from '../systems/UpgradeManager.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.input = null;
        this.player = null;
        this.waveManager = null;
        this.collision = null;
        this.upgradeManager = null;
        this.clock = new THREE.Clock();
        this.projectiles = [];
        this.enemies = [];
        this.isPaused = false;

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
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorTexture = textureLoader.load('./assets/floor.png');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(10, 10);

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

        // Player
        this.player = new Player(this.camera, this.input, this.scene, this.projectiles, this.playerSkinURL);

        // Systems
        this.upgradeManager = new UpgradeManager(this);
        this.waveManager = new WaveManager(this.scene, this.player, this.enemies, this.upgradeManager);
        this.collision = new Collision(this.player, this.enemies, this.projectiles);

        // Events
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Start Loop
        this.animate();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.exitPointerLock();
            document.getElementById('start-screen').style.display = 'flex';
            document.getElementById('start-screen').querySelector('h1').innerText = "PAUSED";
            document.getElementById('start-screen').querySelector('p').innerText = "Press P or Click to Resume";
        } else {
            document.body.requestPointerLock();
            document.getElementById('start-screen').style.display = 'none';
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isPaused) return;

        const dt = this.clock.getDelta();

        // Allow updates if locked OR if we want to debug (optional, but let's stick to lock for now)
        if (this.input.isLocked) {
            // Update Entities
            this.player.update(dt);

            // Update Projectiles
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                const p = this.projectiles[i];
                p.update(dt);
                if (p.shouldRemove) {
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                }
            }

            // Update Enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                e.update(dt, this.player.position);
                if (e.isDead) {
                    this.scene.remove(e.mesh);
                    this.enemies.splice(i, 1);
                    // Maybe score update here
                }
            }

            // Update Systems
            this.waveManager.update(dt);
            this.collision.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
