import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { RangedEnemy } from '../entities/RangedEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';
import { LauncherEnemy } from '../entities/LauncherEnemy.js';
import { Utils } from '../core/Utils.js';
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
        this.enemiesToSpawn = 0;
        this.enemiesKilled = 0;
        this.waveActive = false;
        this.bossSpawned = false;
    }

    update(dt) {
        // Lógica da Onda
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
                this.game.showUpgradeScreen();
            }
        } else {
            // Initial start or waiting for next wave
            if (this.currentWave === 0) {
                this.waveTimer -= dt;
                if (this.waveTimer <= 0) {
                    this.startNextWave();
                }
            } else {
                // Determine what to do between waves?
                this.waveTimer -= dt; // reuse timer?
                // Let's just auto-start next wave for now or wait 3s
                if (this.waveTimer <= 0) {
                    // Reset timer for next pause? 
                    // To do: Add proper "Wave Complete" state
                }
            }

            // Auto start logic fix:
            if (!this.waveInProgress && this.enemies.length === 0) {
                this.waveTimer -= dt;
                if (this.waveTimer <= 0) {
                    this.waveTimer = this.timeBetweenWaves;
                    this.startNextWave();
                }
            }
        }
    }

    startNextWave() {
        this.currentWave++; // Use currentWave
        this.waveInProgress = true;
        this.bossSpawned = false; // Reset boss flag for new wave

        const waveDisplay = document.getElementById('wave-display');
        if (waveDisplay) waveDisplay.innerText = this.currentWave;

        // BOSS WAVE LOGIC
        if (this.currentWave % 10 === 0) {
            this.totalEnemiesInWave = 1; // Only the boss for this wave
            this.enemiesToSpawn = 1;
            this.spawnEnemy(); // Immediately try to spawn the boss
        } else {
            const numEnemies = 2 + Math.floor(this.currentWave * 1.5);
            this.totalEnemiesInWave = numEnemies;
            this.enemiesToSpawn = numEnemies;
        }
    }

    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        if (this.enemiesToSpawn <= 0) return; // No more enemies to spawn for this wave

        // BOSS WAVE LOGIC
        if (this.currentWave % 10 === 0 && !this.bossSpawned) {
             // Spawn Boss
             this.game.spawnBoss(this.currentWave); // Assuming game has a spawnBoss method
             this.bossSpawned = true;
             this.enemiesToSpawn--; // Decrement as boss is spawned
             return;
        }
        
        if (this.bossSpawned) return; // Don't spawn minions while boss is alive (or maybe yes?)

        const enemyType = this.getEnemyType();
        this.game.spawnEnemy(enemyType); // Assuming game has a spawnEnemy method
        this.enemiesToSpawn--;
    }

    getEnemyType() {
        const spawnPos2D = Utils.getRandomSpawnPosition(40, 15); // Increased radius
        const spawnPos = { 
            x: this.player.position.x + spawnPos2D.x, 
            y: 0, 
            z: this.player.position.z + spawnPos2D.z 
        };

        // Random Enemy Type based on weights
        const rand = Math.random();
        let enemy;

        // Simple weight system
        if (rand < 0.3) {
            enemy = new MeleeEnemy(this.scene, spawnPos);
        } else if (rand < 0.5) {
            enemy = new RangedEnemy(this.scene, spawnPos, this.player.projectiles);
        } else if (rand < 0.6) {
            enemy = new TankEnemy(this.scene, spawnPos);
        } else if (rand < 0.8) { // 20% Explosive
            enemy = new ExplosiveEnemy(this.scene, spawnPos);
        } else if (rand < 0.9) {
            enemy = new SniperEnemy(this.scene, spawnPos, this.player.projectiles);
        } else {
            enemy = new LauncherEnemy(this.scene, spawnPos, this.player.projectiles);
        }

        this.enemies.push(enemy);
    }
}