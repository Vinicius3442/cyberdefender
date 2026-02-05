import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { Utils } from '../core/Utils.js';
import { WeaponType, WeaponConfig } from '../core/WeaponSystem.js';
import { WeaponFactory } from '../core/WeaponFactory.js';

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

        this.currentSlot = 0;
        this.weaponState = {}; // Store ammo per weapon type
        
        // Recoil & Shake
        this.recoilRecovery = 0;
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        // Load Skin
        this._loadSkin(skinURL);
        this.hp = 100;
        this.maxHp = 100;
        this.score = 0; // Initialize Score
        this.isDead = false;

        // Fixed Inventory (9 Slots)
        this.inventory = new Array(9).fill(null);
        this.inventory[0] = WeaponType.PISTOL;
        this.inventory[1] = WeaponType.SWORD;
        
        this.currentSlot = 0;
        this.weaponState = {}; // Store ammo per weapon type

        // Initialize Ammo
        Object.values(WeaponType).forEach(type => {
            const cfg = WeaponConfig[type];
            this.weaponState[type] = {
                mag: cfg.magSize,
                reserve: cfg.maxReserve,
                maxReserve: cfg.maxReserve // Fix: Track max limit for refills
            };
        });
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.isScoped = false;

        this.weaponModels = {}; // Map type -> mesh group
        this.weaponContainer = new THREE.Group();

        this._init();
    }

    _init() {
        this.camera.rotation.order = 'YXZ';
        
        // Spawn Protection
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 3.0; // 3 seconds grace period on spawn
        this.lastDamageTime = 0;
        this.damageCooldown = 0.5; // Minimum 0.5s between hits from melee

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

    update(dt, isMoving) {
        // Update Immunity
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= dt;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.createFloatingText(this.position, "SYSTEM READY", "#00ff00");
            }
        }

        // Update Weapon Position (Bobbing)
        this._updateWeaponModel(dt, isMoving);
        
        // Recoil Recovery
        if (this.recoilRecovery > 0) {
            const recovery = 2.0 * dt; // Speed of return
            this.camera.rotation.x -= Math.min(recovery, this.recoilRecovery);
            this.recoilRecovery = Math.max(0, this.recoilRecovery - recovery);
        }
        
        // Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.add(new THREE.Vector3(rx, ry, 0)); // Don't shake Z (depth) too much
        }
    }

    _loadSkin(url) {
        // Stashed for later use (e.g. arm meshes)
        if (url) console.log("Skin loaded for local player:", url);
    }

    _updateWeaponModel(dt, isMoving) {
        if (!this.weaponContainer) return;
        
        // Bobbing Logic
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
        
        if (type && this.weaponModels[type]) {
            this.weaponModels[type].visible = true;
            document.getElementById('weapon-display').innerText = type;
            this.updateAmmoDisplay();
        } else {
            // Empty slot (Hands)
            document.getElementById('weapon-display').innerText = "HANDS";
            document.getElementById('ammo-display').innerText = "-";
        }
    }

    updateAmmoDisplay() {
        const type = this.getCurrentWeaponType();
        if (!type) {
             document.getElementById('ammo-display').innerText = "-";
             return;
        }

        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        const text = config.magSize === Infinity ? "∞" : `${state.mag} / ${state.reserve}`;
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
        if (!type) return;

        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        if (config.magSize === Infinity) return;
        if (state.mag === config.magSize) return; // Full mag
        if (state.reserve <= 0) return; // No ammo

        const needed = config.magSize - state.mag;
        const amount = Math.min(needed, state.reserve);

        state.mag += amount;
        state.reserve -= amount;
        
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
        if (!type) return; // No weapon

        const config = WeaponConfig[type];
        const state = this.weaponState[type];

        // Check Ammo
        if (config.magSize !== Infinity) {
            if (state.mag <= 0) {
                // Click sound / dry fire feedback could go here
                return;
            }
        }

        // Decrement Ammo
        if (config.magSize !== Infinity) {
            state.mag--;
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
                projectile.mesh = Projectile.createPlasma();
                projectile.mesh.position.copy(spawnPos);
                // BFG moves slow but spins
                projectile.spinRate = new THREE.Vector3(0, 0, 5); 
            } else if (type === WeaponType.LAUNCHER) {
                projectile.isExplosive = true;
                projectile.explosionRadius = config.radius;
                projectile.mesh = Projectile.createMissile();
                projectile.mesh.position.copy(spawnPos);
                projectile.mesh.lookAt(spawnPos.clone().add(spreadDir));
            } else if (type === WeaponType.CROSSBOW) {
                // Arrow Visual
                const arrowGroup = new THREE.Group();
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
                shaft.rotation.x = -Math.PI / 2;
                arrowGroup.add(shaft);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
                tip.rotation.x = -Math.PI / 2;
                tip.position.z = 0.2;
                arrowGroup.add(tip);
                // Fins
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                fin.position.z = -0.15;
                arrowGroup.add(fin);

                // Replace default projectile mesh
                projectile.mesh = arrowGroup;
                projectile.mesh.position.copy(spawnPos);
                // Rotate arrow to match direction
                projectile.mesh.lookAt(spawnPos.clone().add(spreadDir));
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

        // Ground Check
        let groundHeight = 0;
        if (this.game) {
            groundHeight = this.game.getTerrainHeight(this.position.x, this.position.z);
        }
        const minHeight = groundHeight + 1.6;

        if (this.position.y < minHeight) {
            this.position.y = minHeight;
            this.velocity.y = 0;
            this.canJump = true;
        }

        this.camera.position.copy(this.position);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        if (this.isInvulnerable) return; // Spawn protection
        
        // Cooldown check for rapid hits (unless amount is massive, e.g. explosion?)
        // Let's enforce cooldown for ALL damage to stop instakills
        const now = Date.now() / 1000;
        if (now - this.lastDamageTime < this.damageCooldown) {
            return;
        }
        this.lastDamageTime = now;

        this.hp -= amount;
        document.getElementById('hp-display').innerText = Math.floor(this.hp);
        
        // Red Flash Effect
        // Red Flash Effect
        let flash = document.getElementById('damage-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'damage-flash';
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100%';
            flash.style.height = '100%';
            flash.style.backgroundColor = 'red'; // Color managed by opacity
            flash.style.pointerEvents = 'none';
            flash.style.zIndex = '999';
            flash.style.opacity = '0';
            flash.style.transition = 'opacity 0.1s';
            document.body.appendChild(flash);
        }

        // Trigger flash
        flash.style.opacity = '0.2'; // Reduced from 0.4
        
        // Clear existing timeout if any (simple debounce)
        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        
        this.flashTimeout = setTimeout(() => {
            flash.style.opacity = '0';
        }, 100);

        if (this.hp <= 0) this.die();
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        document.exitPointerLock();

        // 1. Initial Glitch & Freeze
        const hud = document.getElementById('ui-layer');
        hud.style.animation = 'none'; // Stop normal flicker
        
        // Create Corruption Overlay if not exists
        let corruption = document.getElementById('corruption-overlay');
        if (!corruption) {
            corruption = document.createElement('div');
            corruption.id = 'corruption-overlay';
            corruption.style.position = 'absolute';
            corruption.style.top = '0'; corruption.style.left = '0';
            corruption.style.width = '100%'; corruption.style.height = '100%';
            corruption.style.zIndex = '4500';
            corruption.style.pointerEvents = 'none';
            corruption.style.display = 'none';
            corruption.innerHTML = `
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:600px; font-family:'Courier New'; color:#f00; font-weight:bold; background:rgba(0,0,0,0.8); padding:20px; border: 2px solid #f00;">
                    <div style="border-bottom:1px solid #f00; margin-bottom:10px;">SYSTEM DIAGNOSTIC TOOL v1.0</div>
                    <div id="diag-list" style="text-align:left; font-size:14px; line-height:1.5;"></div>
                </div>
            `;
            document.body.appendChild(corruption);
        }
        
        corruption.style.display = 'block';
        const diagList = document.getElementById('diag-list');
        diagList.innerHTML = '';
        
        const systems = [
            { name: "OPTICAL SENSORS", delay: 500 },
            { name: "MOTOR FUNCTIONS", delay: 1000 },
            { name: "WEAPON LINK", delay: 1500 },
            { name: "LIFE SUPPORT", delay: 2000 },
            { name: "CORE MEMORY", delay: 2500 }
        ];
        
        let currentTime = 0;
        
        systems.forEach((sys, i) => {
            setTimeout(() => {
                const line = document.createElement('div');
                line.innerHTML = `Scanning ${sys.name}... <span style="color:#f00">CRITICAL FAILURE</span>`;
                diagList.appendChild(line);
                
                // Audio hint check?
                // Visual Glitch per failure
                document.body.style.filter = `hue-rotate(${Math.random() * 360}deg) contrast(${1 + i * 0.5})`;
                
                if (i === systems.length - 1) {
                    // Final Crash
                    setTimeout(() => {
                        corruption.style.display = 'none';
                        document.body.style.filter = 'none';
                        this.showGameOver();
                    }, 1500);
                }
            }, sys.delay);
        });
        
        // Submit Score
        if (window.submitScore) {
            window.submitScore(this.score);
        }
    }

    showGameOver() {
         const screen = document.getElementById('game-over-screen');
         screen.style.display = 'flex';
         document.getElementById('final-score').innerText = "SCORE: " + this.score;
    }

    addAmmoToAll(percent) {
        Object.keys(this.weaponState).forEach(type => {
            // Only refill unlocked weapons
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

    addWeapon(type) {
        if (!this.inventory.includes(type)) {
            // Find first empty slot
            const emptyIndex = this.inventory.indexOf(null);
            if (emptyIndex !== -1) {
                this.inventory[emptyIndex] = type;
                this.switchWeapon(emptyIndex); // Auto-switch to new gun
                this.createFloatingText(this.position, `PICKED UP ${type}`, "#00ff00");
            } else {
                // Inventory Full: SWAP current slot
                const currentType = this.inventory[this.currentSlot];
                if (currentType) {
                    // Drop current
                    // Calculate drop position (in front of player)
                    const dropPos = this.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
                    dropPos.y += 1;
                    
                    // We need access to Game to spawn pickup. 
                    // Player doesn't have direct ref to Game, but has Scene.
                    // We can cheat and attach a callback or event, OR use a Global/Utils helper if available.
                    // Or... cleaner: Game passes a "spawnPickup" callback to Player?
                    // Currently Game has `spawnPickup`.
                    // Let's check constructor.
                    // Constructor has `scene, projectiles`. No Game ref.
                    
                    // Workaround: We will emit a custom event on document
                    const event = new CustomEvent('player-drop-item', { 
                        detail: { type: currentType, position: dropPos } 
                    });
                    document.dispatchEvent(event);
                }
                
                // Replace
                this.inventory[this.currentSlot] = type;
                
                // Reset State for new weapon
                const cfg = WeaponConfig[type];
                this.weaponState[type] = {
                    mag: cfg.magSize,
                    reserve: cfg.maxReserve,
                    maxReserve: cfg.maxReserve
                };
                
                this.switchWeapon(this.currentSlot);
                this.createFloatingText(this.position, `SWAPPED ${type}`, "#00ff00");
            }
        } else {
            // Refill ammo
            if (this.weaponState[type]) {
                const config = WeaponConfig[type];
                if (config.magSize !== Infinity) {
                    const amount = Math.floor(config.maxReserve * 0.5); // 50% refill
                    const oldReserve = this.weaponState[type].reserve;
                    this.weaponState[type].reserve = Math.min(this.weaponState[type].reserve + amount, this.weaponState[type].maxReserve);
                    
                    const added = this.weaponState[type].reserve - oldReserve;
                    if (added > 0) {
                        this.createFloatingText(this.position, `+${added} ${type} AMMO`, "#00ffff");
                    } else {
                        // Already full
                        this.createFloatingText(this.position, `${type} FULL`, "#aaaaaa");
                    }
                    this.updateAmmoDisplay();
                }
            }
        }
    }

    removeWeapon(index) {
        if (this.inventory[index]) {
            const type = this.inventory[index];
            this.inventory[index] = null;
            delete this.weaponState[type];
            this.createFloatingText(this.position, `DELETED ${type}`, "#ff0000");
            
            // If we removed current weapon, switch to something else
            if (index === this.currentSlot) {
                // Find first valid
                const validIdx = this.inventory.findIndex(x => x !== null);
                if (validIdx !== -1) {
                    this.switchWeapon(validIdx);
                } else {
                    // No weapons left, clear model
                    this.currentSlot = index;
                    if (this.currentWeaponModel) this.currentWeaponModel.visible = false;
                }
            }
        }
    }

    applyRecoil() {
        // Pitch up (negative X)
        this.camera.rotation.x += 0.05; // Kick
        this.recoilRecovery += 0.05;
    }

    applyScreenShake(intensity = 0.2) {
        this.shakeTime = 0.2;
        this.shakeIntensity = intensity;
    }

    createFloatingText(pos, text, color) {
        // Create DOM element for easier management than 3D text
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'absolute';
        el.style.color = color;
        el.style.fontWeight = 'bold';
        el.style.fontSize = '20px';
        el.style.textShadow = '1px 1px 0 #000';
        el.style.pointerEvents = 'none';
        
        // Initial 2D Project
        // We need update loop to sync position... or just CSS animation "float up and fade"
        // Let's do simple center screen float up
        el.style.left = '50%';
        el.style.top = '40%';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.transition = 'all 1.0s';
        
        document.body.appendChild(el);
        
        // Animate
        setTimeout(() => {
            el.style.top = '30%';
            el.style.opacity = '0';
        }, 50);
        
        setTimeout(() => el.remove(), 1000);
    }
}
