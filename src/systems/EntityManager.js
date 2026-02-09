import * as THREE from 'three';
import { Utils } from '../core/Utils.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { RangedEnemy } from '../entities/RangedEnemy.js';
import { TankEnemy } from '../entities/TankEnemy.js';
import { SniperEnemy } from '../entities/SniperEnemy.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';
import { LauncherEnemy } from '../entities/LauncherEnemy.js';
import { ED209 } from '../entities/bosses/Ed209Boss.js';
import { AtomBoss } from '../entities/bosses/AtomBoss.js';
// Castle Enemies
import { ShieldEnemy } from '../entities/ShieldEnemy.js';
import { KnightEnemy } from '../entities/KnightEnemy.js';
import { ArcherEnemy } from '../entities/ArcherEnemy.js';
import { NinjaEnemy } from '../entities/NinjaEnemy.js';
import { AssassinEnemy } from '../entities/AssassinEnemy.js';
import { MountedKnightEnemy } from '../entities/MountedKnightEnemy.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        // CRITICAL FIX: Use the shared enemies array from Game instance
        // otherwise Collision system (which holds reference to game.enemies) knows nothing about these entities.
        this.enemies = game.enemies;
    }

    get scene() {
        return this.game.scene;
    }

    update(dt) {
        // Update Enemies
        const playerPos = this.game.player.position;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Logic Culling (Performance)
            // Skip updates if too far, UNLESS it's a Boss or specialized type
            const dist = e.mesh.position.distanceTo(playerPos);
            if (dist > 1000 && !e.isBoss) {
                e.mesh.visible = false; // Cull visual logic too if needed (frustum does this, but this ensures)
                continue;
            } else {
                e.mesh.visible = true;
            }

            e.update(dt, playerPos);

            // Death cleanup
            if (e.isDead && e.shouldRemove) {
                this.removeEnemy(i);
            }
        }
    }

    removeEnemy(index) {
        const e = this.enemies[index];
        if (e.mesh) this.scene.remove(e.mesh);

        this.enemies.splice(index, 1);

        // Score & Drop Logic
        if (this.game.player) this.game.player.score += 100;

        if (Math.random() < 0.5) {
            if (this.game.spawnRandomDrop) {
                this.game.spawnRandomDrop(e.mesh.position.clone());
            }
        }
    }

    clear() {
        // Remove all enemies from scene
        for (const e of this.enemies) {
            if (e.mesh) this.scene.remove(e.mesh);
        }
        this.enemies.length = 0; // Maintain reference for other systems
    }

    spawnEnemy(type, spawnPos = null) {
        if (!type) return;

        let position;

        if (spawnPos) {
            position = { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z };
        } else {
            // Position Logic (Randomized around player)
            const spawnPos2D = Utils.getRandomSpawnPosition(40, 15);
            position = {
                x: this.game.player.position.x + spawnPos2D.x,
                y: 0,
                z: this.game.player.position.z + spawnPos2D.z
            };
        }

        // Align with terrain IF NOT provided or if we want to snap
        // If spawnPos is provided (e.g. from WaveManager with logic), we might trust it?
        // But WaveManager often sets Y=10.
        // Let's snap to terrain only if height is missing or 0? 
        // Actually, for Castle, we want to snap to 0 (flat).
        // If we trust scene.userData.getTerrainHeight, we should always snap?
        // UNLESS it's a flying enemy?
        // Let's always snap for safety unless we really want sky drops.
        // WaveManager uses Y=10 for sky drops.

        // Revised Logic:
        // If spawnPos is provided, use it. 
        // If not, random + snap.

        if (!spawnPos && this.game.getTerrainHeight) {
            position.y = this.game.getTerrainHeight(position.x, position.z);
        } else if (spawnPos) {
            // If passed from WaveManager (Y=10), keep it? 
            // Yes, WaveManager handles "Sky Drop".
        }

        let enemy;
        // Projectiles passed from Game
        const projectiles = this.game.projectiles;
        const scene = this.scene; // Getter

        switch (type) {
            case 'MELEE': enemy = new MeleeEnemy(scene, position); break;
            case 'RANGED': enemy = new RangedEnemy(scene, position, projectiles); break;
            case 'TANK': enemy = new TankEnemy(scene, position); break;
            case 'SNIPER': enemy = new SniperEnemy(scene, position, projectiles); break;
            case 'EXPLOSIVE': enemy = new ExplosiveEnemy(scene, position); break;
            case 'LAUNCHER': enemy = new LauncherEnemy(scene, position, projectiles); break;
            case 'ED209': enemy = new ED209(scene, position, projectiles); break;
            case 'ATOM': enemy = new AtomBoss(scene, this.game.player, position); break;
            // CASTLE ENEMIES
            case 'SHIELD': enemy = new ShieldEnemy(scene, position); break;
            case 'KNIGHT': enemy = new KnightEnemy(scene, position); break;
            case 'ARCHER': enemy = new ArcherEnemy(scene, position, projectiles); break;
            case 'NINJA': enemy = new NinjaEnemy(scene, position); break;
            case 'ASSASSIN': enemy = new AssassinEnemy(scene, position); break;
            case 'CAVALRY': enemy = new MountedKnightEnemy(scene, position); break;

            default:
                console.warn("EntityManager: Unknown enemy type:", type);
                return;
        }

        if (enemy) {
            enemy.isBoss = (type === 'ED209' || type === 'ATOM');
            this.enemies.push(enemy);
        }
    }

    spawnBoss(identifier) {
        // Wrap Game.js boss logic
        // CASE A: WAVE NUMBER
        if (typeof identifier === 'number') {
            const waveNum = identifier;
            console.log("ENTITY_MANAGER: Resolving Boss for Wave", waveNum);
            if (waveNum % 10 === 0) {
                console.log("ENTITY_MANAGER: Spawning ATOM");
                this.spawnBoss('ATOM');
            } else if (waveNum % 5 === 0) {
                this.spawnBoss('ED209');
            }
            return;
        }

        const type = identifier;

        let spawnZ = -50;
        if (type === 'ATOM') spawnZ = -40;

        const h = this.game.getTerrainHeight ? this.game.getTerrainHeight(0, spawnZ) : 0;
        const pos = new THREE.Vector3(0, h + (type === 'ATOM' ? 15 : 2), spawnZ);

        let enemy;
        const projectiles = this.game.projectiles;
        const scene = this.scene; // Getter

        console.log(`ENTITY_MANAGER: Spawning Boss ${type} at`, pos);

        switch (type) {
            case 'ED209': enemy = new ED209(scene, pos, projectiles); break;
            case 'ATOM':
                enemy = new AtomBoss(scene, this.game.player, pos);
                // Boss Arena setup?
                if (this.game.worldGen && this.game.worldGen.spawnBossArena) {
                    this.game.worldGen.spawnBossArena(new THREE.Vector3(0, 0, 0));
                }
                if (this.game.player.applyScreenShake) {
                    this.game.player.applyScreenShake(0.5);
                }
                break;
            default:
                this.spawnEnemy(type);
                return;
        }

        if (enemy) {
            console.log("ENTITY_MANAGER: Enemy created successfully", type);
            enemy.isBoss = true;
            if (!enemy.projectiles) enemy.projectiles = projectiles;
            this.enemies.push(enemy);
            console.log("ENTITY_MANAGER: Enemy pushed. Count:", this.enemies.length);

            // Ensure mesh added if not already
            if (!scene.getObjectByProperty('uuid', enemy.mesh.uuid)) {
                scene.add(enemy.mesh);
            }
        }
    }
}
