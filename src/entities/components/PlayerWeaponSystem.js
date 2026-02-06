import * as THREE from 'three';
import { Projectile } from '../Projectile.js';
import { WeaponConfig, WeaponType } from '../../core/WeaponSystem.js';
import { WeaponFactory } from '../../core/WeaponFactory.js';

export class PlayerWeaponSystem {
    constructor(player) {
        this.player = player;
        this.scene = player.scene;
        this.camera = player.camera;
        
        // Weapon State
        this.inventory = new Array(3).fill(null);
        this.currentSlot = 0;
        this.weaponState = {}; 
        this.weaponModels = {};
        this.weaponContainer = new THREE.Group();
        this.isReloading = false;
        this.attackCooldown = 0;
        
        // Visuals
        this.bobTimer = 0;
        this.recoilRecovery = 0; // Moved recoil here since it affects camera, but logic is tied to shooting

        this._init();
    }

    _init() {
        this.weaponContainer.position.set(0.3, -0.3, -0.5);
        this.camera.add(this.weaponContainer);
        
        // Initial Inventory
        this.inventory[0] = WeaponType.PISTOL; 
        this.inventory[2] = WeaponType.SWORD;
        
        // Initialize Ammo State
        Object.values(WeaponType).forEach(type => {
            const cfg = WeaponConfig[type];
            this.weaponState[type] = {
                mag: cfg.magSize,
                reserve: cfg.maxReserve,
                maxReserve: cfg.maxReserve
            };
        });
        
        this._createWeaponModels();
        this.switchWeapon(0);
    }

    update(dt, velocity) {
        // Update Weapon Bobbing
        const isMoving = velocity && velocity.lengthSq() > 0.1;
        this._updateWeaponModel(dt, isMoving);

        // Update Cooldown
        if (this.attackCooldown > 0) this.attackCooldown -= dt;


    }

    _updateWeaponModel(dt, isMoving) {
        if (!this.weaponContainer) return;
        
        if (!this.bobTimer) this.bobTimer = 0;
        
        if (isMoving) {
            this.bobTimer += dt * 10;
            this.weaponContainer.position.y = -0.3 + Math.sin(this.bobTimer) * 0.01;
            this.weaponContainer.position.x = 0.3 + Math.cos(this.bobTimer * 0.5) * 0.01;
        } else {
            this.bobTimer = 0;
            // Return to rest
            this.weaponContainer.position.y = THREE.MathUtils.lerp(this.weaponContainer.position.y, -0.3, dt * 5);
            this.weaponContainer.position.x = THREE.MathUtils.lerp(this.weaponContainer.position.x, 0.3, dt * 5);
        }
    }

    _createWeaponModels() {
        Object.values(WeaponType).forEach(type => {
            const model = WeaponFactory.createWeaponMesh(type);
            model.visible = false;
            this.weaponModels[type] = model;
            this.weaponContainer.add(model);
        });
    }

    getCurrentWeaponType() {
        return this.inventory[this.currentSlot];
    }
    
    getCurrentWeaponConfig() {
        const type = this.getCurrentWeaponType();
        return type ? WeaponConfig[type] : null;
    }

    toggleScope(active) {
        const config = this.getCurrentWeaponConfig();
        if (active && config && config.scopeZoom) {
            this.player.baseFov = this.player.baseFov || 75; // ensure base exists
            this.camera.fov = this.player.baseFov * config.scopeZoom;
            this.weaponContainer.visible = false;
        } else {
            this.camera.fov = this.player.baseFov || 75;
            this.weaponContainer.visible = true;
        }
        this.camera.updateProjectionMatrix();
    }

    switchWeapon(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.inventory.length) return;

        // Reset scope if switching (handled by Player mostly, but we trigger it)
        if (this.player.isScoped) this.player.toggleScope(false);

        this.currentSlot = slotIndex;
        this.isReloading = false; // Cancel reload
        
        const type = this.getCurrentWeaponType();

        // Update Visuals
        Object.values(this.weaponModels).forEach(model => model.visible = false);
        
        if (type && this.weaponModels[type]) {
            this.weaponModels[type].visible = true;
            document.getElementById('weapon-display').innerText = type;
            this.updateAmmoDisplay();
        } else {
            // Empty slot
            document.getElementById('weapon-display').innerText = "HANDS";
            document.getElementById('ammo-display').innerText = "-";
        }
        
        // Remove Timer UI if exists
        const reloadUI = document.getElementById('reload-timer');
        if (reloadUI) reloadUI.style.display = 'none';
        if (this.reloadInterval) clearInterval(this.reloadInterval);
    }

    updateAmmoDisplay() {
        const type = this.getCurrentWeaponType();
        if (!type) {
             const el = document.getElementById('ammo-display');
             if(el) el.innerText = "-";
             return;
        }

        const config = WeaponConfig[type];
        const state = this.weaponState[type];
        
        if (!state) return;

        const text = config.magSize === Infinity ? "∞" : `${state.mag} / ${state.reserve}`;
        const el = document.getElementById('ammo-display');
        if(el) el.innerText = text;
    }

    reload() {
        console.log("WEAPON_SYS: Reload Requested");
        if (this.isReloading) return;

        const type = this.getCurrentWeaponType();
        if (!type) return;

        const config = WeaponConfig[type];
        const state = this.weaponState[type];
        
        if (!config || !state) return;
        if (config.magSize === Infinity) return;
        if (state.mag >= config.magSize) {
            this.player.createFloatingText(this.player.position, "FULL", "#ffffff");
            return; 
        } 
        if (state.reserve <= 0) {
            this.player.createFloatingText(this.player.position, "NO AMMO", "#ff0000");
            return;
        }

        console.log(`WEAPON_SYS: Reload Started (${type})`);
        this.isReloading = true;
        this.player.createFloatingText(this.player.position, "RELOADING...", "#ffff00");

        // UI Timer
        let reloadUI = document.getElementById('reload-timer');
        if (!reloadUI) {
            reloadUI = document.createElement('div');
            reloadUI.id = 'reload-timer';
            reloadUI.style.position = 'absolute';
            reloadUI.style.top = '60%'; 
            reloadUI.style.left = '50%';
            reloadUI.style.transform = 'translate(-50%, -50%)';
            reloadUI.style.color = '#ffff00';
            reloadUI.style.fontFamily = 'Arial, sans-serif';
            reloadUI.style.fontSize = '16px';
            reloadUI.style.fontWeight = 'bold';
            reloadUI.style.textShadow = '1px 1px 2px black';
            reloadUI.style.pointerEvents = 'none';
            reloadUI.style.zIndex = '1000'; // Force on top
            document.body.appendChild(reloadUI);
        }
        reloadUI.style.display = 'block';

        const totalTime = (config.reloadTime || 2.0); 
        let remaining = totalTime;

        if (this.reloadInterval) clearInterval(this.reloadInterval);
        
        this.reloadInterval = setInterval(() => {
            if (!this.isReloading || this.player.isDead) { // Check player dead via reference
                clearInterval(this.reloadInterval);
                reloadUI.style.display = 'none';
                return;
            }
            remaining -= 0.1;
            if (remaining < 0) remaining = 0;
            reloadUI.innerText = `RELOAD ${remaining.toFixed(1)}s`;
        }, 100);

        // Visual Feedback
        const model = this.weaponModels[type];
        if (model) model.rotation.x -= 0.8;

        setTimeout(() => {
            if (this.reloadInterval) clearInterval(this.reloadInterval);
            reloadUI.style.display = 'none';

            if (this.player.isDead) return;
            
            const needed = config.magSize - state.mag;
            const available = Math.min(needed, state.reserve);
            
            state.mag += available;
            if (config.maxReserve !== Infinity) {
                state.reserve -= available;
            }

            console.log(`WEAPON_SYS: Reload Complete. Added ${available}.`);

            this.updateAmmoDisplay();
            this.isReloading = false;
            
            if (model) model.rotation.x += 0.8;
            
            this.player.createFloatingText(this.player.position, "READY", "#00ff00");

        }, totalTime * 1000);
    }

    attack() {
        if (this.player.isDead || this.attackCooldown > 0) return;
        if (this.isReloading) return;

        const type = this.getCurrentWeaponType();
        if (!type) return; 

        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        // Check Ammo
        if (config.magSize !== Infinity) {
            if (state.mag <= 0) {
                // Dry fire
                return;
            }
        }

        // Decrement Ammo
        if (config.magSize !== Infinity) {
            state.mag--;
            this.updateAmmoDisplay();
        }

        this.attackCooldown = config.fireRate;

        // Recoil/Animation
        this._playFireAnimation(type, config);

        // Projectile Logic
        if (config.isMelee) {
            this.player.isAttacking = true; // Set flag on player for hit detection? Or keep local?
            // Existing logic uses player.isAttacking. We should sync it or move hit detection here.
            // For now, sync:
            this.player.isAttacking = true; // Assumes player has this property
            setTimeout(() => this.player.isAttacking = false, 200);
        } else {
            this._fireProjectile(type, config);
        }
    }

    _playFireAnimation(type, config) {
        const model = this.weaponModels[type];
        if (!model) return;

        if (config.isMelee) {
             // Melee Swing
             const initialRot = model.rotation.clone();
             const initialPos = model.position.clone();

             model.rotation.x -= 0.5;
             model.rotation.y += 0.5;
             model.position.x += 0.1;

             setTimeout(() => {
                 model.rotation.x += 1.5; 
                 model.rotation.y -= 1.0; 
                 model.position.x -= 0.2; 
                 model.position.z -= 0.2; 

                 // Slash Effect (using player's camera for positioning)
                 // NOTE: Player.js had 'this.particleSystem'. If player doesn't have it, we skip.
                 if (this.player.particleSystem) {
                     const slashPos = this.camera.position.clone().add(
                         this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5)
                     );
                     const slashRot = this.camera.quaternion.clone();
                     const roll = (Math.random() - 0.5) * 1.0;
                     slashRot.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
                     this.player.particleSystem.createSlash(slashPos, slashRot);
                 }

                 setTimeout(() => {
                     model.rotation.copy(initialRot);
                     model.position.copy(initialPos);
                 }, 150);
             }, 50);
        } else {
            // Gun Kick
            model.rotation.x += 0.1;
            model.position.z += 0.05;

            
            setTimeout(() => {
                model.rotation.x -= 0.1;
                model.position.z -= 0.05;
            }, 50);
        }
    }

    _fireProjectile(type, config) {
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

            // Visual Offset
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            const gunOffset = right.clone().multiplyScalar(0.2).add(up.clone().multiplyScalar(-0.2)).add(spreadDir.clone().multiplyScalar(0.5));
            const spawnPos = this.camera.position.clone().add(gunOffset);

            // Projectile
            const projectile = new Projectile(spawnPos, spreadDir, true);
            projectile.damage = config.damage;
            projectile.velocity = spreadDir.clone().multiplyScalar(config.projectileSpeed || 20);
            projectile.mesh.material.color.setHex(config.color || 0xffff00);

            // Special Types
            if (type === WeaponType.BFG) {
                projectile.isBFG = true;
                projectile.radius = config.radius;
                projectile.mesh = Projectile.createPlasma();
                projectile.mesh.position.copy(spawnPos);
                projectile.spinRate = new THREE.Vector3(0, 0, 5); 
            } else if (type === WeaponType.LAUNCHER) {
                projectile.isExplosive = true;
                projectile.explosionRadius = config.radius;
                projectile.mesh = Projectile.createMissile();
                projectile.mesh.position.copy(spawnPos);
                projectile.mesh.lookAt(spawnPos.clone().add(spreadDir));
            } else if (type === WeaponType.CROSSBOW) {
                this._setupArrowVisual(projectile, spawnPos, spreadDir);
            }

            // Spawn via Player's Game Reference
            if (this.player.game && this.player.game.spawnProjectile) {
                this.player.game.spawnProjectile(projectile);
            }
        }
    }

    _setupArrowVisual(projectile, spawnPos, dir) {
        const arrowGroup = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        shaft.rotation.x = -Math.PI / 2;
        arrowGroup.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        tip.rotation.x = -Math.PI / 2;
        tip.position.z = 0.2;
        arrowGroup.add(tip);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        fin.position.z = -0.15;
        arrowGroup.add(fin);

        projectile.mesh = arrowGroup;
        projectile.mesh.position.copy(spawnPos);
        projectile.mesh.lookAt(spawnPos.clone().add(dir));
    }
    
    // Inventory Management
    addWeapon(type) {
         if (!type) return;
         const config = WeaponConfig[type];
         
         if (this.inventory.includes(type)) {
             // Refill
             const state = this.weaponState[type];
             if (state && config.magSize !== Infinity) {
                 const reserveCap = (config.maxReserve === Infinity) ? 9999 : config.maxReserve;
                 const addAmount = (config.maxReserve === Infinity) ? 0 : Math.floor(config.maxReserve * 0.5);
                 state.reserve = Math.min(state.reserve + addAmount, reserveCap);
                 
                 this.player.createFloatingText(this.player.position, `+AMMO ${type}`, "#00ffff");
                 this.updateAmmoDisplay();
                 return;
             }
         }
         
         // Add Logic
         if (config.isMelee) {
             this.inventory[2] = type;
             this._resetWeaponState(type);
             this.player.createFloatingText(this.player.position, `EQUIPPED ${type}`, "#ffcc00");
             if (this.currentSlot === 2) this.switchWeapon(2);
             return;
         }
         
         if (!this.inventory[0]) {
             this.inventory[0] = type;
             this._resetWeaponState(type);
             this.switchWeapon(0);
         } else if (!this.inventory[1]) {
             this.inventory[1] = type;
             this._resetWeaponState(type);
             this.switchWeapon(1);
         } else {
             // Replace
             let slot = this.currentSlot;
             if (slot === 2) slot = 0;
             
             // Drop old
             const oldType = this.inventory[slot];
             if (oldType) this.dropWeaponLogic(oldType); // Helper
             
             this.inventory[slot] = type;
             this._resetWeaponState(type);
             this.switchWeapon(slot);
             this.player.createFloatingText(this.player.position, `SWAPPED ${type}`, "#00ff00");
         }
    }

    _resetWeaponState(type) {
        const cfg = WeaponConfig[type];
        this.weaponState[type] = {
            mag: cfg.magSize,
            reserve: cfg.maxReserve,
            maxReserve: cfg.maxReserve
        };
        if (!this.weaponModels[type]) {
             const model = WeaponFactory.createWeaponMesh(type);
             model.visible = false;
             this.weaponModels[type] = model;
             this.weaponContainer.add(model); 
        }
    }

    dropWeapon() {
         if (this.currentSlot === 2) {
             this.player.createFloatingText(this.player.position, "CAN'T DROP MELEE", "#ff0000");
             return;
         }
         const type = this.inventory[this.currentSlot];
         if (!type) return;
         
         this.dropWeaponLogic(type);
         
         // Remove
         this.inventory[this.currentSlot] = null;
         delete this.weaponState[type];
         
         // Switch
         const validIdx = this.inventory.findIndex(x => x !== null);
         if (validIdx !== -1) {
             this.switchWeapon(validIdx);
         } else {
             this.switchWeapon(this.currentSlot); // Hide
         }
    }

    dropWeaponLogic(type) {
        const dropPos = this.camera.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5));
        dropPos.y += 0.5;
        const event = new CustomEvent('player-drop-item', { 
            detail: { type: type, position: dropPos } 
        });
        document.dispatchEvent(event);
    }
    
    addAmmoToAll(percent) {
        Object.keys(this.weaponState).forEach(type => {
            if (this.inventory.includes(type)) {
                const config = WeaponConfig[type];
                if (config.magSize !== Infinity) {
                     const amount = Math.floor(this.weaponState[type].maxReserve * percent);
                     this.weaponState[type].reserve = Math.min(this.weaponState[type].reserve + amount, this.weaponState[type].maxReserve);
                }
            }
        });
        this.updateAmmoDisplay();
    }
}
