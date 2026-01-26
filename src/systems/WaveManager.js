import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { RangedEnemy } from '../entities/RangedEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';
import { LauncherEnemy } from '../entities/LauncherEnemy.js';
import { Utils } from '../core/Utils.js';
import { Chest } from '../entities/Chest.js';
import * as THREE from 'three';

export class WaveManager {
    constructor(scene, player, enemies, upgradeManager, game) {
        this.scene = scene;
        this.player = player;
        this.enemies = enemies;
        this.upgradeManager = upgradeManager;
        this.game = game;

        this.currentWave = 0;
        this.waveInProgress = false;
        this.timeBetweenWaves = 3.0;
        this.waveTimer = 0;
        this.totalEnemiesInWave = 0;

        // Controle do baú ativo
        this.activeChest = null;
    }

    update(dt) {
        // 1. Lógica do Baú (prioridade sobre a onda)
        if (this.activeChest) {
            this.activeChest.update(dt);

            // Verifica a distância do player para o baú
            const dist = this.player.position.distanceTo(this.activeChest.position);

            // Se o player estiver perto (3 unidades) e o baú ainda estiver fechado
            if (dist < 3.0 && !this.activeChest.isOpened) {
                this.activeChest.open();

                // Aguarda 1.5s para ver a animação e depois chama os upgrades
                setTimeout(() => {
                    if (this.activeChest) {
                        this.scene.remove(this.activeChest.mesh);
                        this.activeChest = null;
                    }
                    this.upgradeManager.showUpgrades();
                }, 1500);
            }
            // Retornamos aqui para não processar lógica de onda enquanto lida com o baú
            return;
        }

        // 2. Lógica da Onda
        if (this.waveInProgress) {
            // Update Progress Bar
            const enemiesLeft = this.enemies.length;
            const progress = this.totalEnemiesInWave > 0
                ? ((this.totalEnemiesInWave - enemiesLeft) / this.totalEnemiesInWave) * 100
                : 100;

            const progressBar = document.getElementById('wave-progress-bar');
            if (progressBar) progressBar.style.width = `${progress}%`;

            if (this.enemies.length === 0) {
                this.waveInProgress = false;

                // A cada 10 ondas -> Spawna o Baú
                if (this.currentWave > 0 && this.currentWave % 10 === 0) {
                    this.triggerChest();
                } else {
                    // Trigger Upgrade imediatamente se não for onda de baú
                    this.upgradeManager.showUpgrades();
                }
            }
        } else {
            // Initial start or waiting for next wave
            if (this.currentWave === 0) {
                this.waveTimer -= dt;
                if (this.waveTimer <= 0) {
                    this.startNextWave();
                }
            }
        }
    }

    startNextWave() {
        this.currentWave++;
        this.waveInProgress = true;
        const waveDisplay = document.getElementById('wave-display');
        if (waveDisplay) waveDisplay.innerText = this.currentWave;

        const numEnemies = 2 + Math.floor(this.currentWave * 1.5);
        this.totalEnemiesInWave = numEnemies;

        for (let i = 0; i < numEnemies; i++) {
            this.spawnEnemy();
        }
    }

    spawnEnemy() {
        const spawnPos2D = Utils.getRandomSpawnPosition(40, 15); // Increased radius
        const spawnPos = { x: spawnPos2D.x, y: 0, z: spawnPos2D.z };

        // Random Enemy Type based on weights
        const rand = Math.random();
        let enemy;

        // Simple weight system
        if (rand < 0.4) {
            enemy = new MeleeEnemy(this.scene, spawnPos);
        } else if (rand < 0.6) {
            enemy = new RangedEnemy(this.scene, spawnPos, this.player.projectiles);
        } else if (rand < 0.7) {
            enemy = new TankEnemy(this.scene, spawnPos);
        } else if (rand < 0.8) {
            enemy = new ExplosiveEnemy(this.scene, spawnPos);
        } else if (rand < 0.9) {
            enemy = new SniperEnemy(this.scene, spawnPos, this.player.projectiles);
        } else {
            enemy = new LauncherEnemy(this.scene, spawnPos, this.player.projectiles);
        }

        this.enemies.push(enemy);
    }

    triggerChest() {
        // Spawn Chest in front of player
        const spawnDist = 5.0;
        const playerDir = new THREE.Vector3();
        this.player.camera.getWorldDirection(playerDir);
        playerDir.y = 0;
        playerDir.normalize();

        const spawnPos = this.player.position.clone().add(playerDir.multiplyScalar(spawnDist));
        spawnPos.y = 0; // On floor

        // Cria o baú e guarda na variável activeChest para o update() monitorar
        this.activeChest = new Chest(this.scene, spawnPos);
    }
}