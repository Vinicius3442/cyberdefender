import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { Utils } from '../core/Utils.js';
import { PlayerWeaponSystem } from './components/PlayerWeaponSystem.js';

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

        // Visuals
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        // Load Skin
        this._loadSkin(skinURL);
        this.hp = 100;
        this.maxHp = 100;
        this.score = 0; 
        this.isDead = false;

        this.isAttacking = false;
        this.isScoped = false;

        // Subsystems
        this.weaponSystem = new PlayerWeaponSystem(this);

        this._init();
    }

    _init() {
        this.camera.rotation.order = 'YXZ';
        
        // Spawn Protection
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 3.0; 

        this.lastDamageTime = 0;
        this.damageCooldown = 0.2; 

        // Input callbacks
        this.input.onMouseMove = (dx, dy) => this._onMouseMove(dx, dy);
        this.input.onAttack = () => this.weaponSystem.attack();
        
        // Scene Setup
        this.scene.add(this.camera);
        // WeaponSystem handles its own container

        // Shield UI Setup
        // Try to find existing armor display first
        this.shieldUI = document.getElementById('armor-display');
        
        if (!this.shieldUI) {
            this.shieldUI = document.getElementById('shield-display');
        }

        if (!this.shieldUI) {
            this.shieldUI = document.createElement('div');
            this.shieldUI.id = 'shield-display';
            this.shieldUI.style.position = 'absolute';
            this.shieldUI.style.bottom = '80px'; 
            this.shieldUI.style.left = '20px';
            this.shieldUI.style.fontSize = '24px';
            this.shieldUI.style.fontWeight = 'bold';
            this.shieldUI.style.color = '#00ffff';
            this.shieldUI.style.fontFamily = 'Arial, sans-serif';
            this.shieldUI.style.textShadow = '2px 2px 0 #000';
            this.shieldUI.style.zIndex = '1000';
            this.shieldUI.style.display = 'none';
            document.body.appendChild(this.shieldUI);
        }
    }

    // --- FACADE METHODS (Delegated to WeaponSystem) ---

    getCurrentWeaponType() {
        return this.weaponSystem.getCurrentWeaponType();
    }

    getCurrentWeaponConfig() {
        return this.weaponSystem.getCurrentWeaponConfig();
    }

    switchWeapon(slotIndex) {
        this.weaponSystem.switchWeapon(slotIndex);
    }

    reload() {
        this.weaponSystem.reload();
    }

    attack() {
        this.weaponSystem.attack();
    }

    addWeapon(type) {
        this.weaponSystem.addWeapon(type);
    }

    removeWeapon(index) {
        this.weaponSystem.removeWeapon(index);
    }

    dropWeapon() {
        this.weaponSystem.dropWeapon();
    }
    
    addAmmoToAll(percent) {
        this.weaponSystem.addAmmoToAll(percent);
    }

    updateAmmoDisplay() {
        this.weaponSystem.updateAmmoDisplay();
    }

    _loadSkin(url) {
        if (url) console.log("Skin loaded for local player:", url);
    }

    toggleScope(active) {
        this.isScoped = active;
        if (this.weaponSystem) this.weaponSystem.toggleScope(active);
    }

    _onMouseMove(dx, dy) {
        if (this.isDead) return;

        let sensitivity = 0.002;
        if (this.isScoped) sensitivity *= 0.2; 

        this.eulerAngles.y -= dx * sensitivity;
        this.eulerAngles.x -= dy * sensitivity;
        this.eulerAngles.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.eulerAngles.x));
        this.camera.quaternion.setFromEuler(this.eulerAngles);
    }




    update(dt) {
        if (this.isDead) return;
        
        // Cap dt
        if (dt > 0.1) dt = 0.1;

        // Weapon System Update
        if (this.weaponSystem) {
             this.weaponSystem.update(dt, this.velocity);
        }

        // Immunity
        // Immunity & Shield UI
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= dt;
            if (this.frameCount % 60 === 0) console.log(`PLAYER: God Timer: ${this.invulnerabilityTimer.toFixed(2)}`);
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                console.log("PLAYER: Spawn Protection EXPIRED. God Mode: OFF");
                this.createFloatingText(this.position, "SYSTEM READY", "#00ff00");
            }

            // Update Shield UI
            if (this.shieldUI) {
                    this.shieldUI.innerText = `SHIELD: ${this.invulnerabilityTimer.toFixed(1)}s`;
                    this.shieldUI.style.display = 'block';
                    this.shieldUI.style.color = '#00ffff';
            }
        } else {
            if (this.shieldUI) {
                 this.shieldUI.innerText = "0";
                 this.shieldUI.style.color = '#ffffff';
                 
                 // If ID is armor-display, keep visible
                 if (this.shieldUI.id === 'shield-display') {
                     this.shieldUI.style.display = 'none';
                 } else {
                     this.shieldUI.style.display = 'block';
                 }
            }
        }
        

        
        // Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.add(new THREE.Vector3(rx, ry, 0)); 
        }
        
        // Debug Heartbeat
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;

        // Movement
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

        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Collision
        let groundHeight = 0;
        if (this.game) {
            groundHeight = this.game.getTerrainHeight(this.position.x, this.position.z);
        } else if (this.scene && this.scene.userData.getTerrainHeight) {
            groundHeight = this.scene.userData.getTerrainHeight(this.position.x, this.position.z);
        }


        const minHeight = groundHeight + 1.6; 

        if (this.position.y < minHeight) {
            this.position.y = minHeight;
            this.velocity.y = 0;
            this.canJump = true;
        }
        
        // Sync Camera
        this.camera.position.copy(this.position);

        // Auto-Fire
        if (this.input.keys.attack) {
            if (this.weaponSystem.isReloading) {
                 // Block
            } else {
                const type = this.weaponSystem.getCurrentWeaponType();
                const state = this.weaponSystem.weaponState[type];
                
                // Auto Reload Check
                if (state && state.mag <= 0 && state.reserve > 0) {
                    this.weaponSystem.reload();
                } else {
                    this.weaponSystem.attack();
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

    teleport(pos) {
        if (!pos) return;
        this.position.copy(pos);
        this.velocity.set(0, 0, 0);
        this.camera.position.copy(this.position);
    }
}
