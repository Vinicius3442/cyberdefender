import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { RangedEnemy } from '../entities/RangedEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';
import { LauncherEnemy } from '../entities/LauncherEnemy.js';
import { Utils } from '../core/Utils.js';

export class WaveManager {
    constructor(scene, player, enemies, upgradeManager) {
        this.scene = scene;
        this.player = player;
        this.enemies = enemies;
        this.upgradeManager = upgradeManager;

        this.currentWave = 0;
        this.waveInProgress = false;
        this.timeBetweenWaves = 3.0;
        this.waveTimer = 0;
        this.totalEnemiesInWave = 0;
    }

    update(dt) {
        if (this.waveInProgress) {
            // Update Progress Bar
            const enemiesLeft = this.enemies.length;
            const progress = ((this.totalEnemiesInWave - enemiesLeft) / this.totalEnemiesInWave) * 100;
            document.getElementById('wave-progress-bar').style.width = `${progress}%`;

            if (this.enemies.length === 0) {
                this.waveInProgress = false;
                // Trigger Upgrade instead of immediate next wave
                this.upgradeManager.showUpgrades();
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
        document.getElementById('wave-display').innerText = this.currentWave;

        const numEnemies = 2 + Math.floor(this.currentWave * 1.5);

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
