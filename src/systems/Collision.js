import * as THREE from 'three';
import { Utils } from '../core/Utils.js';
import { ExplosiveEnemy } from '../entities/ExplosiveEnemy.js';

export class Collision {
    constructor(player, enemies, projectiles, particleSystem) {
        this.player = player;
        this.enemies = enemies;
        this.projectiles = projectiles;
        this.particleSystem = particleSystem;
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
                // We check backwards from current position to previous
                // Actually, assuming projective moved logic is external, we check the path it JUST covered.
                // If Projectile moved V * dt, we check along that ray.
                const checkPos = proj.mesh.position.clone().sub(proj.velocity.clone().multiplyScalar(this.dt || 0.016).multiplyScalar(1 - factor));
                
                // Temp check box at this interpolated position
                const projBox = new THREE.Box3().setFromCenterAndSize(
                    checkPos,
                    new THREE.Vector3(0.5, 0.5, 0.5) // Slightly larger bullet box
                );

                if (proj.isPlayerProjectile) {
                    for (const enemy of this.enemies) {
                        if (enemy.isDead) continue;
                        const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

                        if (Utils.checkCollision(projBox, enemyBox)) {
                            if (proj.isExplosive) {
                                this.createExplosion(checkPos, proj.explosionRadius, proj.damage, false);
                            } else {
                                enemy.takeDamage(proj.damage);
                            }
                            proj.shouldRemove = true;
                            break; // Stop steps
                        }
                    }
                } else {
                    // Player Hitbox Fix
                    // Player pos is at feet (0, 1.6, 0) usually? No, Player.js: "this.position = new THREE.Vector3(0, 1.6, 0);" 
                    // AND update() keeps it at groundHeight + 1.6. So position is EYE LEVEL?
                    // "groundHeight + 1.6" suggests position is 1.6m ABOVE ground.
                    // So feet are at pos.y - 1.6.
                    // Box center should be pos.y - 0.8 (mid body).
                    // Size 1.8 height.
                    const centerPos = this.player.position.clone();
                    centerPos.y -= 0.8; 
                    
                    const playerBox = new THREE.Box3().setFromCenterAndSize(
                        centerPos,
                        new THREE.Vector3(0.6, 1.8, 0.6)
                    );

                    if (Utils.checkCollision(projBox, playerBox)) {
                        /* console.log("HIT PLAYER! Damage:", proj.damage); */
                        // Hit Player
                        if (proj.isExplosive) {
                            this.createExplosion(checkPos, proj.explosionRadius, proj.damage, true);
                        } else {
                            this.player.takeDamage(proj.damage);
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

            const attackPos = this.player.position.clone().add(playerDir.multiplyScalar(1.0));
            const attackBox = new THREE.Box3().setFromCenterAndSize(
                attackPos,
                new THREE.Vector3(1.5, 2.0, 1.5)
            );

            for (const enemy of this.enemies) {
                if (enemy.isDead) continue;
                const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

                if (Utils.checkCollision(attackBox, enemyBox)) {
                    enemy.takeDamage(this.player.getCurrentWeaponConfig().damage);
                }
            }
        }

        // 3. Enemies vs Player (Melee contact)
        const centerPos = this.player.position.clone();
        centerPos.y -= 0.8; // Fix: Lower box to covers body, not just head
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            centerPos,
            new THREE.Vector3(0.5, 1.8, 0.5)
        );

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

            if (Utils.checkCollision(playerBox, enemyBox)) {
                if (enemy.isExplosive || enemy instanceof ExplosiveEnemy) {
                    this.createExplosion(enemy.mesh.position, 5.0, enemy.damage, true);
                    enemy.die();
                } else {
                    this.player.takeDamage(0.5);
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
                this.player.takeDamage(damage);
            }
        }
    }
}
