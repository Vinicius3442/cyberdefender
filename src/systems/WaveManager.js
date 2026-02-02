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
                // Trigger Upgrades immediately explicitly if needed (or just wait for next wave timer?)
                // The prompt implies "chance to drop weapon on death", so maybe wave completion 
                // doesn't trigger upgrades anymore? No, drops are per enemy.
                // But we still need wave progression.
                // Revert to simple wave timer or maybe a "Wave Complete" text.
                // Let's keep showing upgrades for now if that's the only way to heal/get stronger,
                // OR disable it if the user wants purely loot drops.
                // User said "backpack... drag drop", so maybe drops are the main way.
                // I'll keep the Wave Complete pause but remove the Chest spawn.
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
}