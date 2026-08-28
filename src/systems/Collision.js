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
        this._tempVec2 = new THREE.Vector3();
        this._tempVec3 = new THREE.Vector3();
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
                        if (enemy.isDead || !enemy.mesh) continue;

                        // Fast & Reliable Hitbox (No matrix traversal lag, 100% tangible)
                        if (enemy.hitboxSize) {
                            const offset = enemy.hitboxOffset || this._tempVec2.set(0, 0.9, 0);
                            this._tempVec3.copy(enemy.mesh.position).add(offset);
                            this._tempBox2.setFromCenterAndSize(this._tempVec3, enemy.hitboxSize);
                        } else {
                            this._tempBox2.setFromObject(enemy.mesh);
                        }

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
                    // Player Hitbox Fix (GC Free)
                    this._tempVec3.copy(this.player.position);
                    this._tempVec3.y -= 0.8;

                    this._tempBox2.setFromCenterAndSize(
                        this._tempVec3,
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
                if (!enemy || enemy.isDead || !enemy.mesh) continue;

                if (enemy.hitboxSize) {
                    const offset = enemy.hitboxOffset || this._tempVec2.set(0, 0.9, 0);
                    this._tempVec3.copy(enemy.mesh.position).add(offset);
                    this._tempBox2.setFromCenterAndSize(this._tempVec3, enemy.hitboxSize);
                } else {
                    this._tempBox2.setFromObject(enemy.mesh);
                }

                if (this._tempBox1.intersectsBox(this._tempBox2)) {
                    enemy.takeDamage(this.player.getCurrentWeaponConfig().damage);
                }
            }
        }

        // 3. Enemies vs Player (Melee contact)
        this._tempVec.copy(this.player.position);
        this._tempVec.y -= 0.8;

        this._tempBox1.setFromCenterAndSize(
            this._tempVec,
            this._tempSize.set(0.5, 1.8, 0.5)
        );

        for (const enemy of this.enemies) {
            if (!enemy || enemy.isDead || !enemy.mesh) continue;

            if (enemy.hitboxSize) {
                const offset = enemy.hitboxOffset || this._tempVec2.set(0, 0.9, 0);
                this._tempVec3.copy(enemy.mesh.position).add(offset);
                this._tempBox2.setFromCenterAndSize(this._tempVec3, enemy.hitboxSize);
            } else {
                this._tempBox2.setFromObject(enemy.mesh);
            }

            if (this._tempBox1.intersectsBox(this._tempBox2)) {
                if (enemy.isExplosive || enemy instanceof ExplosiveEnemy) {
                    this.createExplosion(enemy.mesh.position, 5.0, enemy.damage, true);
                    enemy.die();
                } else {
                    this.player.takeDamage(0.5, "CONTACT: " + enemy.constructor.name.toUpperCase());
                }
            }

            if (enemy.currentAnim === 'attack' && enemy.damage > 0) {
                const dist = enemy.mesh.position.distanceTo(this.player.position);
                const meleeThreshold = Math.min(enemy.attackRange || 3.0, 3.0) + 0.5;

                if (dist < meleeThreshold) {
                    if (!enemy.hasDealtAttackDamage) {
                        this.player.takeDamage(enemy.damage, enemy.constructor.name.toUpperCase());
                        enemy.hasDealtAttackDamage = true;
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
