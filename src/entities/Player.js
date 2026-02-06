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

        // Fixed Inventory (3 Slots: Primary, Secondary, Melee)
        this.inventory = new Array(3).fill(null);
        this.inventory[0] = WeaponType.PISTOL; // Default Primary? Or Secondary?
        this.inventory[2] = WeaponType.SWORD; // Melee fixed in slot 3
        
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
        // Spawn Protection
        // Spawn Protection
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 3.0; // Increased to 3s for safer load times

        this.lastDamageTime = 0;
        this.damageCooldown = 0.2; // 200ms cooldown (allow 5 hits/sec)

        // Input callbacks
        this.input.onMouseMove = (dx, dy) => this._onMouseMove(dx, dy);
        this.input.onAttack = () => this.attack();
        // REMOVED: onSwitchWeapon, onReload, onZoom, onDrop handled by Game.js to respect Paused State


        // Setup Weapon Container
        this.weaponContainer.position.set(0.3, -0.3, -0.5);
        this.camera.add(this.weaponContainer);
        this.scene.add(this.camera);

        // Create Models
        this._createWeaponModels();
        this.switchWeapon(0);
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
        
        // Reset Reload State
        this.isReloading = false;
        
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
        
        // Safety Check
        if (!state) return;
        if (typeof state.mag !== 'number' || isNaN(state.mag)) state.mag = config.magSize === Infinity ? 999 : config.magSize;
        if (typeof state.reserve !== 'number' || isNaN(state.reserve)) state.reserve = config.maxReserve === Infinity ? 999 : config.maxReserve;

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
        console.log("PLAYER: Reload Requested");
        // Block if already reloading
        if (this.isReloading) {
            console.log("PLAYER: Reload Ignored (Already Reloading)");
            return;
        }

        const type = this.getCurrentWeaponType();
        if (!type) return;

        const config = WeaponConfig[type];
        const state = this.weaponState[type];
        
        // Validation
        if (!config || !state) return;
        if (config.magSize === Infinity) return;
        if (state.mag >= config.magSize) {
            this.createFloatingText(this.position, "FULL", "#ffffff");
            return; 
        } 
        if (state.reserve <= 0) {
            this.createFloatingText(this.position, "NO AMMO", "#ff0000");
            return;
        }

        // Start Reload
        console.log(`PLAYER: Reload Started (${type})`);
        this.isReloading = true;
        this.createFloatingText(this.position, "RELOADING...", "#ffff00");

        // UI Timer Setup
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
            reloadUI.style.fontSize = '24px';
            reloadUI.style.fontWeight = 'bold';
            reloadUI.style.textShadow = '1px 1px 2px black';
            reloadUI.style.pointerEvents = 'none';
            document.body.appendChild(reloadUI);
        }
        reloadUI.style.display = 'block';

        const totalTime = (config.reloadTime || 2.0); // seconds
        let remaining = totalTime;

        // Animate Timer
        // Use a unique ID for the interval to clear it safely
        if (this.reloadInterval) clearInterval(this.reloadInterval);
        
        this.reloadInterval = setInterval(() => {
            if (!this.isReloading || this.isDead) {
                if (this.reloadInterval) clearInterval(this.reloadInterval);
                reloadUI.style.display = 'none';
                return;
            }
            remaining -= 0.1;
            if (remaining < 0) remaining = 0;
            reloadUI.innerText = `RELOAD ${remaining.toFixed(1)}s`;
        }, 100);

        // Visual Feedback (Dip weapon)
        const model = this.weaponModels[type];
        if (model) {
            model.rotation.x -= 0.8;
        }

        setTimeout(() => {
            if (this.reloadInterval) clearInterval(this.reloadInterval);
            reloadUI.style.display = 'none';

            if (this.isDead) return;
            if (!this.game) return; // Game ended?
            
            // Logic
            const needed = config.magSize - state.mag;
            const available = Math.min(needed, state.reserve);
            
            state.ammo += available; // Refill Mag
            if (config.maxReserve !== Infinity) {
                state.reserve -= available; // Deduct from Reserve
            }

            console.log(`PLAYER: Reload Complete. Added ${available}. Mag: ${state.ammo}, Reserve: ${state.reserve}`);

            this.updateAmmoDisplay();
            this.isReloading = false;
            
            // Restore visual
            if (model) {
                model.rotation.x += 0.8;
            }
            
            this.createFloatingText(this.position, "READY", "#00ff00");

        }, totalTime * 1000);
    }






        



    attack() {
        if (this.isDead || this.attackCooldown > 0) return;
        if (this.isReloading) return; // Block shooting while reloading


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

            // Aim Convergence Logic
            const targetDist = 50; // Assume target is 50m away (or raycast if we had it)
            const targetPoint = this.camera.position.clone().add(spreadDir.clone().multiplyScalar(targetDist));

            // Visual Gun Offset (Right Handed)
            // Ideally get from weaponModels[type] but it's local.
            // Approx offset relative to camera:
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            
            // Default offset (0.3 right, -0.2 down, 0.5 forward)
            const gunOffset = right.clone().multiplyScalar(0.2).add(up.clone().multiplyScalar(-0.2)).add(spreadDir.clone().multiplyScalar(0.5));
            const spawnPos = this.camera.position.clone().add(gunOffset);

            // Recalculate direction from Gun to Target
            const finalDir = new THREE.Vector3().subVectors(targetPoint, spawnPos).normalize();
            
            const projectile = new Projectile(spawnPos, finalDir, true);
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

            if (this.game && this.game.spawnProjectile) {
                this.game.spawnProjectile(projectile);
            } else {
                console.error("Game reference missing in Player, cannot spawn projectile");
            }
        }
    }

    update(dt) {
        if (this.isDead) return;
        
        // Cap dt to prevent massive jumps (lag spikes) from eating timers instantly
        if (dt > 0.1) dt = 0.1;

        // --- MERGED LOGIC start ---
        // Update Immunity
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= dt;
            if (this.frameCount % 60 === 0) console.log(`PLAYER: God Timer: ${this.invulnerabilityTimer.toFixed(2)}`);
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                console.log("PLAYER: Spawn Protection EXPIRED. God Mode: OFF");
                this.createFloatingText(this.position, "SYSTEM READY", "#00ff00");
            }
        }

        // Update Weapon Position (Bobbing)
        // Check if moving (Velocity > 0.1)
        const isMoving = this.velocity.lengthSq() > 0.1; // Simple check
        this._updateWeaponModel(dt, isMoving);
        
        // Recoil Recovery
        if (this.recoilRecovery > 0) {
            const recovery = 2.0 * dt; 
            this.camera.rotation.x -= Math.min(recovery, this.recoilRecovery);
            this.recoilRecovery = Math.max(0, this.recoilRecovery - recovery);
        }
        
        // Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.add(new THREE.Vector3(rx, ry, 0)); 
        }
        // --- MERGED LOGIC end ---
        
        // Debug Heartbeat
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 100 === 0) console.log(`PLAYER HEARTBEAT: Pos ${this.position.y.toFixed(2)}`);

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // 1. Calculate Velocity based on Input
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

        // 2. Apply Velocity to Position (RESTORED MISSING CODE)
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // 3. Ground / Terrain Collision
        let groundHeight = 0;
        if (this.game) {
            groundHeight = this.game.getTerrainHeight(this.position.x, this.position.z);
        } else if (this.scene && this.scene.userData.getTerrainHeight) {
            groundHeight = this.scene.userData.getTerrainHeight(this.position.x, this.position.z);
        }

        const minHeight = groundHeight + 1.6; // Eye level

        if (this.position.y < minHeight) {
            this.position.y = minHeight;
            this.velocity.y = 0;
            this.canJump = true;
        }
        
        // Sync Camera
        this.camera.position.copy(this.position);

        // Auto-Fire
        if (this.input.keys.attack) {
            if (this.isReloading) {
                 // Prevent shooting
            } else {
                // Auto Reload if empty
                const state = this.weaponState[this.inventory[this.currentSlot]];
                if (state && state.ammo <= 0 && state.reserve > 0) {
                    this.reload();
                } else {
                    this.attack();
                }
            }
        }
    }



    takeDamage(amount) {
        if (this.isDead) return;
        // Spawn Protection
        if (this.isInvulnerable) return; 
        
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
        // document.exitPointerLock(); // Moved to end to prevent premature pause

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
                        // Trigger Game Over UI FIRST so Input.js sees it open
                        if (this.game && this.game.showGameOver) {
                            this.game.showGameOver();
                        }
                        
                        document.exitPointerLock(); 
                        corruption.style.display = 'none';
                        document.body.style.filter = 'none';
                    }, 500); // Wait bit after last log
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
        if (!type) return;
        
        const config = WeaponConfig[type];
        
        // 1. Check if we already have it -> Refill Ammo
        if (this.inventory.includes(type)) {
            const state = this.weaponState[type];
            if (state && config.magSize !== Infinity) {
                // If maxReserve is Infinity, we don't need to add anything (or we add 0)
                // If it is finite, we calculate logic.
                
                const reserveCap = (config.maxReserve === Infinity) ? 9999 : config.maxReserve;
                const addAmount = (config.maxReserve === Infinity) ? 0 : Math.floor(config.maxReserve * 0.5);
                
                state.reserve = Math.min(state.reserve + addAmount, reserveCap);
                
                this.createFloatingText(this.position, `+AMMO ${type}`, "#00ffff");
                this.updateAmmoDisplay();
                return;
            }
        }

        // 2. Logic: Slot 1 or 2 (Indexes 0, 1)
        // If Melee -> Force replace Slot 3 (Index 2)
        if (config.isMelee) {
            this.inventory[2] = type;
            this._resetWeaponState(type);
            this.createFloatingText(this.position, `EQUIPPED ${type}`, "#ffcc00");
            // If currently holding melee, refresh
            if (this.currentSlot === 2) this.switchWeapon(2);
            return;
        }

        // Guns: Try Slot 0 (Primary) then Slot 1 (Secondary)
        if (!this.inventory[0]) {
            this.inventory[0] = type;
            this._resetWeaponState(type);
            this.switchWeapon(0);
        } else if (!this.inventory[1]) {
            this.inventory[1] = type;
            this._resetWeaponState(type);
            this.switchWeapon(1);
        } else {
            // BOTH FULL: Replace CURRENT slot (if not melee)
            let slot = this.currentSlot;
            if (slot === 2) slot = 0; // If holding melee, replace Primary default

            // Drop old logic? 
            // "User: substituir o slot 1 e 2" -> implies replacing.
            // Let's drop the old one to be nice.
            const oldType = this.inventory[slot];
            if (oldType) {
                // Emit Drop Event
                const dropPos = this.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
                dropPos.y += 0.5;
                const event = new CustomEvent('player-drop-item', { 
                     detail: { type: oldType, position: dropPos } 
                });
                document.dispatchEvent(event);
            }

            this.inventory[slot] = type;
            this._resetWeaponState(type);
            this.switchWeapon(slot);
            this.createFloatingText(this.position, `SWAPPED ${type}`, "#00ff00");
        }
    }

    _resetWeaponState(type) {
        const cfg = WeaponConfig[type];
        this.weaponState[type] = {
            mag: cfg.magSize,
            reserve: cfg.maxReserve,
            maxReserve: cfg.maxReserve
        };
       
        // Ensure model exists
        if (!this.weaponModels[type]) {
             const model = WeaponFactory.createWeaponMesh(type);
             model.visible = false;
             this.weaponModels[type] = model;
             this.weaponContainer.add(model); 
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

    dropWeapon() {
        // Can't drop Melee (Slot 2) or Hands (if empty)
        if (this.currentSlot === 2) {
            this.createFloatingText(this.position, "CAN'T DROP MELEE", "#ff0000");
            return;
        }

        const type = this.inventory[this.currentSlot];
        if (!type) return;

        // Visual Drop calculation
        const dropPos = this.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5));
        dropPos.y += 0.5;

        // Emit Drop Event
        const event = new CustomEvent('player-drop-item', { 
            detail: { type: type, position: dropPos } 
        });
        document.dispatchEvent(event);

        // Clear Slot
        this.removeWeapon(this.currentSlot);
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
