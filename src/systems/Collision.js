import * as THREE from 'three';
import { Utils } from '../core/Utils.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';

export class Collision {
    constructor(player, enemies, projectiles, particleSystem) {
        this.player = player;
        this.enemies = enemies;
        this.projectiles = projectiles;
        this.particleSystem = particleSystem;

        // Pre-allocate Cache for GC Free Loop
        this._tempBox1 = new THREE.Box3();
        this._tempBox2 = new THREE.Box3();
        this._tempVec = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3(); // FIX: Added second temp vector
        this._tempSize = new THREE.Vector3();
    }

    update(dt) {
        this.dt = dt;
        // 1. Projectiles vs Enemies & Player
        for (const proj of this.projectiles) {
            if (proj.shouldRemove) continue;

            // 0. Floor Hit
            if (proj.hitFloor) {
                if (proj.isExplosive) {
                    this.createExplosion(proj.mesh.position, proj.explosionRadius, proj.damage, true);
                    proj.shouldRemove = true;
                } else if (!proj.isStuck) {
                    // Normal bullets disappear on floor hit
                    proj.shouldRemove = true;
                }
                // If isStuck (Arrow), do nothing (it lingers)
                continue;
            }

            // BFG Area Damage (Tick based? Or just kill?)
            // Let's make BFG kill everything in radius every frame (OP but fun)
            if (proj.isBFG) {
                const bfgPos = proj.mesh.position;
                for (const enemy of this.enemies) {
                    if (enemy.isDead) continue;
                    if (bfgPos.distanceTo(enemy.mesh.position) < proj.radius) {
                        enemy.takeDamage(proj.damage); // Huge damage
                    }
                }
                // BFG doesn't stop on hit, it keeps going until lifetime ends
                continue;
            }

            // Sub-stepping for High Velocity Detection
            const steps = 8; // Increased from 4 to 8 for fast bullets
            const stepDt = (this.dt || 0.016) / steps;

            for (let s = 0; s < steps; s++) {
                if (proj.shouldRemove) break;

                // Simple check at interpolated position
                const factor = (s + 1) / steps;

                // Optimized Vector Math (Use separate vectors to avoid reference clash)
                // 1. Calculate Offset into _tempVec2
                this._tempVec2.copy(proj.velocity).multiplyScalar((this.dt || 0.016) * (1 - factor));

                // 2. Calculate Check Position: Pos - Offset
                this._tempVec.copy(proj.mesh.position).sub(this._tempVec2);

                // Temp check box at this interpolated position
                this._tempBox1.setFromCenterAndSize(
                    this._tempVec, // Center
                    this._tempSize.set(0.5, 0.5, 0.5) // Size
                );

                if (proj.isPlayerProjectile) {
                    for (const enemy of this.enemies) {
                        if (enemy.isDead) continue;

                        // Optimized Enemy Box (No alloc)
                        this._tempBox2.setFromObject(enemy.mesh);

                        if (this._tempBox1.intersectsBox(this._tempBox2)) {
                            console.log("Hit registered on enemy!", enemy.constructor.name);
                            if (proj.isExplosive) {
                                this.createExplosion(this._tempVec, proj.explosionRadius, proj.damage, false);
                            } else {
                                enemy.takeDamage(proj.damage);
                            }
                            proj.shouldRemove = true;
                            break; // Stop steps
                        }
                    }
                } else {
                    // Player Hitbox Fix
                    const centerPos = this.player.position.clone(); // Can optimize this too but it's once per step
                    centerPos.y -= 0.8;

                    this._tempBox2.setFromCenterAndSize(
                        centerPos,
                        this._tempSize.set(0.6, 1.8, 0.6)
                    );

                    if (this._tempBox1.intersectsBox(this._tempBox2)) {
                        /* console.log("HIT PLAYER! Damage:", proj.damage); */
                        // Hit Player
                        if (proj.isExplosive) {
                            this.createExplosion(this._tempVec, proj.explosionRadius, proj.damage, true);
                        } else {
                            this.player.takeDamage(proj.damage, "PROJECTILE");
                        }
                        proj.shouldRemove = true;
                        break;
                    }
                }
            } // End for steps
        } // End for proj


        // 2. Sword vs Enemies
        if (this.player.isAttacking && this.player.getCurrentWeaponConfig().isMelee) {
            const attackRange = 2.5;
            const playerDir = new THREE.Vector3();
            this.player.camera.getWorldDirection(playerDir);

            // Calculate attackPos without clone
            // attackPos = pos + dir * 1.5
            this._tempVec.copy(this.player.position).addScaledVector(playerDir, 1.5);

            this._tempBox1.setFromCenterAndSize(
                this._tempVec,
                this._tempSize.set(1.5, 2.0, 1.5)
            );

            for (const enemy of this.enemies) {
                if (enemy.isDead) continue;
                this._tempBox2.setFromObject(enemy.mesh);

                if (this._tempBox1.intersectsBox(this._tempBox2)) {
                    enemy.takeDamage(this.player.getCurrentWeaponConfig().damage);
                }
            }
        }

        // 3. Enemies vs Player (Melee contact)
        // 3. Enemies vs Player (Melee contact)
        // Optimization: Calculate player box once
        // Re-use _tempBox1 for player box
        // NOTE: We need to use setFromCenterAndSize into a variable we keep valid for the loop
        // But _tempBox1 is reused inside checkCollision if we are not careful?
        // Utils.checkCollision typically takes two boxes.

        // Let's use _tempBox1 for Player and _tempBox2 for Enemy. 
        // We need to ensure we don't overwrite _tempBox1 while iterating.

        // Player Box Construction (No Clone)
        this._tempVec.copy(this.player.position);
        this._tempVec.y -= 0.8;

        this._tempBox1.setFromCenterAndSize(
            this._tempVec,
            this._tempSize.set(0.5, 1.8, 0.5)
        );

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;

            // Optimization: No new Box3()
            this._tempBox2.setFromObject(enemy.mesh);

            // Utils.checkCollision(box1, box2) - Check if it modifies boxes? 
            // Usually intersectsBox is read-only.
            if (this._tempBox1.intersectsBox(this._tempBox2)) {
                if (enemy.isExplosive || enemy instanceof ExplosiveEnemy) {
                    this.createExplosion(enemy.mesh.position, 5.0, enemy.damage, true);
                    enemy.die();
                } else {
                    this.player.takeDamage(0.5, "CONTACT: " + enemy.constructor.name.toUpperCase());
                }
            }

            // NEW: Active Melee Attack Logic (Sword/Lance/Baton)
            // If enemy is attacking AND close enough, deal damage.
            // This fixes the issue where enemies swing but don't hit because body is far.
            if (enemy.currentAnim === 'attack' && enemy.damage > 0) {
                const dist = enemy.mesh.position.distanceTo(this.player.position);

                // FIX: Ranged enemies have huge attackRange (25+). We must CAP the melee detection radius.
                // Only allow melee hits if target is actually close (< 3.5 units)
                const meleeThreshold = Math.min(enemy.attackRange || 3.0, 3.0) + 0.5;

                if (dist < meleeThreshold) {
                    // Deal damage!
                    // To avoid 60 hits per second, we need a cooldown or state check.
                    // But Enemy.js manages 'attack' state duration.
                    // Simplest fix: Low damage per frame OR check a flag 'hasDealtDamage'.
                    // Let's do low continuous damage simulating a "grinder" or adding a flag to enemy.

                    if (!enemy.hasDealtAttackDamage) {
                        this.player.takeDamage(enemy.damage, enemy.constructor.name.toUpperCase());
                        enemy.hasDealtAttackDamage = true; // Reset this when attack starts in Enemy.js

                        // Debug
                        /* console.log("Enemy Hit Player!", enemy.constructor.name); */
                    }
                }
            }
        }
    }

    createExplosion(position, radius, damage, damagePlayer) {
        // Visual debug (optional)
        // console.log("Boom at", position);
        if (this.particleSystem) {
            this.particleSystem.createExplosion(position, 0xffaa00, 20);
        }

        // Damage Enemies
        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            if (position.distanceTo(enemy.mesh.position) <= radius) {
                enemy.takeDamage(damage);
            }
        }

        // Damage Player
        if (damagePlayer) {
            if (position.distanceTo(this.player.position) <= radius) {
                this.player.takeDamage(damage, "EXPLOSION");
            }
        }
    }
}
