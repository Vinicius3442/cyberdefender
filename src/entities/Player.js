import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { Utils } from '../core/Utils.js';
import { WeaponType, WeaponConfig } from '../core/WeaponSystem.js';

export class Player {
    constructor(camera, input, scene, projectiles, skinURL) {
        this.camera = camera;
        this.input = input;
        this.scene = scene;
        this.projectiles = projectiles;
        this.skinURL = skinURL;
        this.baseFov = 75;

        this.position = new THREE.Vector3(0, 1.6, 0);
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.eulerAngles = new THREE.Euler(0, 0, 0, 'YXZ');

        this.speed = 10.0;
        this.jumpForce = 10.0;
        this.gravity = 20.0;
        this.canJump = false;

        this.hp = 100;
        this.maxHp = 100;
        this.isDead = false;

        // Inventory
        this.inventory = [
            WeaponType.PISTOL,
            WeaponType.SWORD,
            WeaponType.SHOTGUN,
            WeaponType.CROSSBOW,
            WeaponType.AXE,
            WeaponType.LMG,
            WeaponType.LAUNCHER
        ];
        this.currentSlot = 0;
        this.weaponState = {}; // Store ammo per weapon type

        // Initialize Ammo
        Object.values(WeaponType).forEach(type => {
            this.weaponState[type] = {
                ammo: WeaponConfig[type].ammo,
                maxAmmo: WeaponConfig[type].maxAmmo
            };
        });

        // Attack state
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.isScoped = false;

        this.weaponModels = {}; // Map type -> mesh group
        this.weaponContainer = new THREE.Group();

        this._init();
    }

    _init() {
        this.camera.rotation.order = 'YXZ';

        // Input callbacks
        this.input.onMouseMove = (dx, dy) => this._onMouseMove(dx, dy);
        this.input.onAttack = () => this.attack();
        this.input.onSwitchWeapon = (index) => this.switchWeapon(index);
        this.input.onReload = () => this.reload();
        this.input.onZoom = (active) => this.toggleScope(active);

        // Setup Weapon Container
        this.weaponContainer.position.set(0.3, -0.3, -0.5);
        this.camera.add(this.weaponContainer);
        this.scene.add(this.camera);

        // Create Models
        this._createWeaponModels();
        this.switchWeapon(0);
    }

    _createWeaponModels() {
        const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
        const matGrey = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3 });
        const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
        const matGreen = new THREE.MeshStandardMaterial({ color: 0x2e4a2e, roughness: 0.6 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });

        // Helper
        const addBox = (parent, w, h, d, x, y, z, mat) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };

        // --- Pistol ---
        const pistol = new THREE.Group();
        addBox(pistol, 0.05, 0.12, 0.08, 0, -0.06, 0.05, matBlack).rotation.x = -0.1;
        addBox(pistol, 0.06, 0.06, 0.25, 0, 0.02, -0.05, matGrey);
        this.weaponModels[WeaponType.PISTOL] = pistol;

        // --- Shotgun ---
        const shotgun = new THREE.Group();
        addBox(shotgun, 0.06, 0.12, 0.1, 0, -0.1, 0.15, matWood).rotation.x = -0.1; // Grip
        addBox(shotgun, 0.08, 0.06, 0.6, 0, 0, -0.1, matBlack); // Barrel
        addBox(shotgun, 0.08, 0.04, 0.4, 0, -0.05, -0.1, matWood); // Pump
        this.weaponModels[WeaponType.SHOTGUN] = shotgun;

        // --- SMG ---
        const smg = new THREE.Group();
        addBox(smg, 0.05, 0.15, 0.08, 0, -0.1, 0.15, matBlack).rotation.x = -0.1;
        addBox(smg, 0.06, 0.08, 0.4, 0, 0, 0, matGrey);
        addBox(smg, 0.04, 0.2, 0.06, 0, -0.1, 0, matBlack);
        this.weaponModels[WeaponType.SMG] = smg;

        // --- Rifle ---
        const rifle = new THREE.Group();
        addBox(rifle, 0.05, 0.15, 0.1, 0, -0.1, 0.2, matBlack).rotation.x = -0.1;
        addBox(rifle, 0.06, 0.08, 0.6, 0, 0, -0.1, matGrey);
        addBox(rifle, 0.04, 0.2, 0.06, 0, -0.1, 0, matBlack).rotation.x = 0.2;
        this.weaponModels[WeaponType.RIFLE] = rifle;

        // --- LMG ---
        const lmg = new THREE.Group();
        addBox(lmg, 0.06, 0.15, 0.1, 0, -0.1, 0.3, matWood).rotation.x = -0.1;
        addBox(lmg, 0.08, 0.1, 0.6, 0, 0, 0, matBlack);
        addBox(lmg, 0.04, 0.04, 0.8, 0, 0, -0.6, matGrey);
        addBox(lmg, 0.15, 0.15, 0.1, 0.1, 0, 0.1, matGreen);
        this.weaponModels[WeaponType.LMG] = lmg;

        // --- Sniper ---
        const sniper = new THREE.Group();
        addBox(sniper, 0.06, 0.15, 0.1, 0, -0.1, 0.2, matWood).rotation.x = -0.1;
        addBox(sniper, 0.06, 0.06, 0.8, 0, 0, -0.2, matBlack);
        addBox(sniper, 0.08, 0.08, 0.3, 0, 0, 0.1, matWood);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2), matBlack);
        scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.08, 0); sniper.add(scope);
        this.weaponModels[WeaponType.SNIPER] = sniper;

        // --- Laser Rifle ---
        const laser = new THREE.Group();
        addBox(laser, 0.06, 0.15, 0.1, 0, -0.1, 0.2, matMetal).rotation.x = -0.1;
        addBox(laser, 0.08, 0.08, 0.6, 0, 0, -0.1, matMetal); // Body
        addBox(laser, 0.02, 0.02, 0.7, 0.03, 0, -0.15, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff })); // Rails
        addBox(laser, 0.02, 0.02, 0.7, -0.03, 0, -0.15, new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff }));
        this.weaponModels[WeaponType.LASER] = laser;

        // --- Crossbow ---
        const crossbow = new THREE.Group();
        addBox(crossbow, 0.05, 0.12, 0.1, 0, -0.1, 0.2, matWood).rotation.x = -0.1;
        addBox(crossbow, 0.08, 0.04, 0.5, 0, 0, 0, matWood); // Stock
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 20, Math.PI), matMetal);
        bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI; bow.position.set(0, 0, -0.25);
        crossbow.add(bow);
        this.weaponModels[WeaponType.CROSSBOW] = crossbow;

        // --- Launcher ---
        const launcher = new THREE.Group();
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0), matGreen);
        tube.rotation.x = Math.PI / 2; launcher.add(tube);
        addBox(launcher, 0.05, 0.15, 0.1, 0, -0.15, 0.2, matBlack).rotation.x = -0.1;
        this.weaponModels[WeaponType.LAUNCHER] = launcher;

        // --- BFG ---
        const bfg = new THREE.Group();
        addBox(bfg, 0.15, 0.2, 0.6, 0, 0, 0, matGreen);
        addBox(bfg, 0.1, 0.1, 0.8, 0.1, 0, -0.2, matGrey);
        addBox(bfg, 0.1, 0.1, 0.8, -0.1, 0, -0.2, matGrey);
        this.weaponModels[WeaponType.BFG] = bfg;

        // --- Sword ---
        const sword = new THREE.Group();
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15), matWood);
        hilt.rotation.x = Math.PI / 2; hilt.position.set(0, 0, 0.15); sword.add(hilt);
        addBox(sword, 0.15, 0.02, 0.02, 0, 0, 0.08, matMetal);
        addBox(sword, 0.04, 0.01, 0.7, 0, 0, -0.25, matMetal);
        sword.rotation.set(0, -0.2, 0.2);
        this.weaponModels[WeaponType.SWORD] = sword;

        // --- Katana ---
        const katana = new THREE.Group();
        const kHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), matBlack);
        kHilt.rotation.x = Math.PI / 2; kHilt.position.set(0, 0, 0.2); katana.add(kHilt);
        addBox(katana, 0.06, 0.01, 0.01, 0, 0, 0.1, matBlack); // Tsuba
        const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.9), matMetal);
        kBlade.position.set(0, 0, -0.35);
        // Curve the blade slightly? Hard with box. Just rotate slightly.
        kBlade.rotation.x = -0.05;
        katana.add(kBlade);
        katana.rotation.set(0, -0.2, 0.2);
        this.weaponModels[WeaponType.KATANA] = katana;

        // --- Axe ---
        const axe = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), matWood);
        handle.rotation.x = Math.PI / 2; handle.position.set(0, -0.2, 0); axe.add(handle);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.05), matMetal);
        head.position.set(0, 0, -0.3); axe.add(head);
        axe.rotation.set(0, -0.2, 0.2);
        this.weaponModels[WeaponType.AXE] = axe;

        // Add all to container, hidden
        Object.values(this.weaponModels).forEach(model => {
            model.visible = false;
            this.weaponContainer.add(model);
        });
    }

    getCurrentWeaponType() {
        return this.inventory[this.currentSlot];
    }

    getCurrentWeaponConfig() {
        return WeaponConfig[this.getCurrentWeaponType()];
    }

    switchWeapon(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.inventory.length) return;

        // Reset scope if switching
        if (this.isScoped) this.toggleScope(false);

        this.currentSlot = slotIndex;
        const type = this.getCurrentWeaponType();

        // Update Visuals
        Object.values(this.weaponModels).forEach(model => model.visible = false);
        if (this.weaponModels[type]) this.weaponModels[type].visible = true;

        // Update HUD
        document.getElementById('weapon-display').innerText = type;
        this.updateAmmoDisplay();
    }

    updateAmmoDisplay() {
        const type = this.getCurrentWeaponType();
        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        const text = config.ammo === Infinity ? "∞" : `${state.ammo} / ${state.maxAmmo}`;
        document.getElementById('ammo-display').innerText = text;
    }

    toggleScope(active) {
        this.isScoped = active;
        const config = this.getCurrentWeaponConfig();
        if (active && config.scopeZoom) {
            this.camera.fov = this.baseFov * config.scopeZoom;
            this.weaponContainer.visible = false;
        } else {
            this.camera.fov = this.baseFov;
            this.weaponContainer.visible = true;
        }
        this.camera.updateProjectionMatrix();
    }

    _onMouseMove(dx, dy) {
        if (this.isDead) return;

        let sensitivity = 0.002;
        if (this.isScoped) sensitivity *= 0.2; // Slower when scoped

        this.eulerAngles.y -= dx * sensitivity;
        this.eulerAngles.x -= dy * sensitivity;
        this.eulerAngles.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.eulerAngles.x));
        this.camera.quaternion.setFromEuler(this.eulerAngles);
    }

    reload() {
        const type = this.getCurrentWeaponType();
        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        if (config.ammo === Infinity) return;
        if (state.ammo === config.maxAmmo) return;

        state.ammo = config.maxAmmo;
        this.updateAmmoDisplay();

        // Visual feedback
        const model = this.weaponModels[type];
        if (model) {
            model.rotation.x -= 0.5;
            setTimeout(() => model.rotation.x += 0.5, 200);
        }
    }

    attack() {
        if (this.isDead || this.attackCooldown > 0) return;

        const type = this.getCurrentWeaponType();
        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        // Check Ammo
        if (config.ammo !== Infinity) {
            if (state.ammo <= 0) {
                this.reload(); // Auto-reload on empty
                return;
            }
        }

        // Decrement Ammo
        if (config.ammo !== Infinity) {
            state.ammo--;
            this.updateAmmoDisplay();
        }

        this.attackCooldown = config.fireRate;

        // Visual feedback (Recoil / Swing)
        const model = this.weaponModels[type];
        if (model) {
            if (config.isMelee) {
                // Swing Animation
                const initialRot = model.rotation.clone();
                const initialPos = model.position.clone();

                // 1. Wind up
                model.rotation.x -= 0.5;
                model.rotation.y += 0.5;
                model.position.x += 0.1;

                setTimeout(() => {
                    // 2. Swing
                    model.rotation.x += 1.5; // Swing down
                    model.rotation.y -= 1.0; // Swing across
                    model.position.x -= 0.2;
                    model.position.z -= 0.2; // Thrust forward

                    // Slash Effect
                    if (this.particleSystem) {
                        const slashPos = this.camera.position.clone().add(
                            this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5)
                        );
                        // Randomize slash angle
                        const slashRot = this.camera.quaternion.clone();
                        const roll = (Math.random() - 0.5) * 1.0;
                        slashRot.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));

                        this.particleSystem.createSlash(slashPos, slashRot);
                    }

                    setTimeout(() => {
                        // 3. Return
                        model.rotation.copy(initialRot);
                        model.position.copy(initialPos);
                    }, 150);
                }, 50);

            } else {
                // Gun Recoil
                model.rotation.x += 0.1;
                model.position.z += 0.05;
                setTimeout(() => {
                    model.rotation.x -= 0.1;
                    model.position.z -= 0.05;
                }, 50);
            }
        }

        // Melee
        if (config.isMelee) {
            this.isAttacking = true;
            setTimeout(() => this.isAttacking = false, 200);
            return;
        }

        // Projectile
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        const pellets = config.pellets || 1;

        for (let i = 0; i < pellets; i++) {
            const spread = config.spread || 0;
            const spreadDir = direction.clone();

            if (spread > 0) {
                spreadDir.x += (Math.random() - 0.5) * spread;
                spreadDir.y += (Math.random() - 0.5) * spread;
                spreadDir.z += (Math.random() - 0.5) * spread;
                spreadDir.normalize();
            }

            const spawnPos = this.camera.position.clone().add(spreadDir.clone().multiplyScalar(1.0));

            const projectile = new Projectile(spawnPos, spreadDir, true);
            projectile.damage = config.damage;
            projectile.velocity = spreadDir.clone().multiplyScalar(config.projectileSpeed || 20);
            projectile.mesh.material.color.setHex(config.color || 0xffff00);

            if (type === WeaponType.BFG) {
                projectile.isBFG = true;
                projectile.radius = config.radius;
                projectile.mesh.geometry = new THREE.SphereGeometry(0.5, 16, 16);
            } else if (type === WeaponType.LAUNCHER) {
                projectile.isExplosive = true;
                projectile.explosionRadius = config.radius;
            }

            this.scene.add(projectile.mesh);
            this.projectiles.push(projectile);
        }
    }

    update(dt) {
        if (this.isDead) return;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Movement (Same as before)
        const speed = this.speed;
        const moveDir = new THREE.Vector3();

        if (this.input.keys.forward) moveDir.z -= 1;
        if (this.input.keys.backward) moveDir.z += 1;
        if (this.input.keys.left) moveDir.x -= 1;
        if (this.input.keys.right) moveDir.x += 1;

        moveDir.normalize();
        moveDir.applyEuler(new THREE.Euler(0, this.eulerAngles.y, 0));

        this.velocity.x = moveDir.x * speed;
        this.velocity.z = moveDir.z * speed;
        this.velocity.y -= this.gravity * dt;

        if (this.input.keys.jump && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false;
        }

        // Auto-Fire
        if (this.input.keys.attack) {
            this.attack();
        }

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        if (this.position.y < 1.6) {
            this.position.y = 1.6;
            this.velocity.y = 0;
            this.canJump = true;
        }

        this.camera.position.copy(this.position);
    }

    takeDamage(amount) {
        this.hp -= amount;
        document.getElementById('hp-display').innerText = Math.floor(this.hp);
        document.body.style.backgroundColor = 'red';
        setTimeout(() => document.body.style.backgroundColor = 'black', 50);
        if (this.hp <= 0) this.die();
    }

    die() {
        this.isDead = true;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.exitPointerLock();
    }

    addWeapon(type) {
        if (!this.inventory.includes(type)) {
            this.inventory.push(type);
            this.switchWeapon(this.inventory.length - 1);
        } else {
            this.weaponState[type].ammo = WeaponConfig[type].maxAmmo;
            this.updateAmmoDisplay();
        }
    }
}
