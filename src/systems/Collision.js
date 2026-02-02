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

    update() {
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

            const projBox = new THREE.Box3().setFromObject(proj.mesh);

            if (proj.isPlayerProjectile) {
                // Check vs Enemies
                for (const enemy of this.enemies) {
                    if (enemy.isDead) continue;
                    const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

                    if (Utils.checkCollision(projBox, enemyBox)) {
                        if (proj.isExplosive) {
                            this.createExplosion(proj.mesh.position, proj.explosionRadius, proj.damage, false);
                        } else {
                            enemy.takeDamage(proj.damage);
                        }
                        proj.shouldRemove = true;
                        break;
                    }
                }
            } else {
                // Check vs Player
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    this.player.position,
                    new THREE.Vector3(0.5, 1.8, 0.5)
                );

                if (Utils.checkCollision(projBox, playerBox)) {
                    if (proj.isExplosive) {
                        this.createExplosion(proj.mesh.position, proj.explosionRadius, proj.damage, true);
                    } else {
                        this.player.takeDamage(proj.damage);
                    }
                    proj.shouldRemove = true;
                }
            }
        }

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
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.player.position,
            new THREE.Vector3(0.5, 1.8, 0.5)
        );

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

            if (Utils.checkCollision(playerBox, enemyBox)) {
                if (enemy instanceof ExplosiveEnemy) {
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
