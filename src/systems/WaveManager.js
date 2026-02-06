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
        this.maxEnemies = 20; // FIX: Define max enemies cap
        this.enemiesKilled = 0;
        this.waveActive = false;
        this.waveActive = false;
        this.bossSpawned = false;
        this.spawnTimer = 0;
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

            if (this.enemies.length === 0 && this.enemiesToSpawn === 0 && !this.waitingForBoss) {
                this.waveInProgress = false;
                this.game.showUpgradeScreen();
            }

            // Spawn Logic
            if (this.enemiesToSpawn > 0) {
                this.spawnTimer -= dt;
                if (this.spawnTimer <= 0) {
                    this.spawnEnemy();
                    this.spawnTimer = 0.5; // Spawn every 0.5s
                }
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
        
        if (this.player && this.player.resetImmunity) {
            this.player.resetImmunity();
        }

        const waveDisplay = document.getElementById('wave-display');
        if (waveDisplay) waveDisplay.innerText = this.currentWave;

        // Cleanup previous wave projectiles
        if (this.game && this.game.clearProjectiles) {
            this.game.clearProjectiles();
        }

        // BOSS WAVE LOGIC
        if (this.currentWave % 10 === 0) {
            this.totalEnemiesInWave = 1;
            this.enemiesToSpawn = 1;

            // Lore Sequence
            const loreUI = document.getElementById('lore-message');
            loreUI.style.display = 'block';
            loreUI.innerText = "WARNING: HIGH ENERGY SIGNATURE DETECTED";
            
            // Delay spawn
            setTimeout(() => {
                loreUI.style.display = 'none';
                this.spawnEnemy(); // Spawn Boss after delay
            }, 3000);
            
            // Note: spawnEnemy logic usually runs every frame via update -> check enemiesToSpawn.
            // But we pause it? "enemiesToSpawn" is 1. update() will try to spawn immediately if we don't block it.
            // We should use a "waveStarting" flag or just rely on the delay call to spawnEnemy manually?
            // Actually spawnEnemy checks enemiesToSpawn. If we set enemiesToSpawn=0 initially then 1 later?
            // Let's set enemiesToSpawn = 0 initially, then = 1 inside timeout.
            // Delay spawn
            this.waitingForBoss = true;
            this.enemiesToSpawn = 0; 

            setTimeout(() => {
                const loreUI = document.getElementById('lore-message');
                if (loreUI) loreUI.style.display = 'none';
                
                this.waitingForBoss = false;
                this.enemiesToSpawn = 1;
                // update() will pick it up
                // this.spawnEnemy(); // Optional immediate spawn
            }, 3000);

        } else {
            const numEnemies = 2 + Math.floor(this.currentWave * 1.5);
            this.totalEnemiesInWave = numEnemies;
            this.enemiesToSpawn = numEnemies;
        }
    }

    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        if (this.enemiesToSpawn <= 0) return; 

        // BOSS WAVE LOGIC
        if (this.currentWave % 10 === 0 && !this.bossSpawned) {
             this.game.spawnBoss(this.currentWave); 
             this.bossSpawned = true;
             this.enemiesToSpawn--; 
             return;
        }
        
        if (this.bossSpawned) return;

        const enemyType = this.getEnemyType();
        this.game.spawnEnemy(enemyType); 
        this.enemiesToSpawn--;
    }

    getEnemyType() {
        // CASTLE BIOME OVERRIDE
        // If we are in Castle Level, spawn only Castle enemies
        // We can check local property or Game property
        if (this.game.currentLevelName === 'CASTLE' || (this.game.level && this.game.level.name === 'CASTLE')) {
             const rand = Math.random();
             // Castle Spawn Logic
             if (rand < 0.3) return 'KNIGHT'; // 30% Knights
             if (rand < 0.5) return 'ARCHER'; // 20% Archers
             if (rand < 0.7) return 'SHIELD'; // 20% Shield Guards
             if (rand < 0.8) return 'NINJA';  // 10% Ninjas
             return 'TANK'; // 20% Heavy Backup (Tanks)
        }

        // WASTELAND (Default)
        const rand = Math.random();
        
        if (rand < 0.3) return 'MELEE';
        if (rand < 0.5) return 'RANGED';
        if (rand < 0.6) return 'TANK';
        if (rand < 0.8) return 'EXPLOSIVE';
        if (rand < 0.9) return 'SNIPER';
        return 'LAUNCHER';
    }
}