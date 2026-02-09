import { WeaponConfig } from '../core/WeaponSystem.js';

export class GameUI {
    constructor(game) {
        this.game = game;
        this._lastHotbarState = '';

        // Cache DOM elements
        this.elHpBar = document.getElementById('hp-bar-fill');
        this.elHpText = document.getElementById('hp-display');

        // Dirty Check State
        this._lastHp = -1;
        this._lastMaxHp = -1;
    }

    updateHUD() {
        if (!this.game.player) return;

        const hp = Math.floor(this.game.player.hp);
        const maxHp = Math.floor(this.game.player.maxHp);

        // Dirty Check: Only update DOM if HP changed
        if (hp !== this._lastHp || maxHp !== this._lastMaxHp) {
            this._lastHp = hp;
            this._lastMaxHp = maxHp;

            const hpPercent = Math.max(0, (hp / maxHp) * 100);

            if (this.elHpBar) {
                this.elHpBar.style.width = hpPercent + '%';

                // Dynamic Color (Only change if class/style actually needs it? 
                // Color changes are rare, so lightweight enough to re-apply, 
                // but ideally we check thresholds)
                let color = '#00ff00';
                let shadow = 'none';

                if (hpPercent < 30) {
                    color = '#ff0000';
                    shadow = '0 0 10px #ff0000';
                } else if (hpPercent < 60) {
                    color = '#ffaa00';
                }

                // Check against last color to avoid style recalc? 
                // style.backgroundColor access forces reflow? No, just read.
                // But blindly setting it is fine if we restricted it to "When HP changes".
                if (this.elHpBar.style.backgroundColor !== color) {
                    this.elHpBar.style.backgroundColor = color;
                    this.elHpBar.style.boxShadow = shadow;
                }
            }

            if (this.elHpText) {
                this.elHpText.innerText = hp;
            }
        }

        // REMOVED: this.game.player.updateAmmoDisplay(); 
        // Logic: Ammo display is event-driven in PlayerWeaponSystem (onFire, onReload, onSwitch).
        // No need to thrash DOM every frame.
    }

    togglePause() {
        if (!this.game.mpGameParams.started && this.game.mode === 'MP') return; // Don't pause in lobby
        if (!this.game.player) return;

        // If Inventory is open, close it instead of normal pause
        const invMenu = document.getElementById('inventory-menu');
        if (invMenu.style.display !== 'none') {
            this.toggleInventory();
            return;
        }

        this.game.isPaused = !this.game.isPaused;

        const gameOverScreen = document.getElementById('game-over-screen');
        const pauseMenu = document.getElementById('pause-menu');

        // Check if game over is active
        const isGameOver = gameOverScreen && gameOverScreen.style.display !== 'none';

        if (this.game.isPaused) {
            if (isGameOver) {
                // Game Over takes precedence, ensure pointer is unlocked
                document.exitPointerLock();
            } else {
                // Formatting: Pause Menu
                if (pauseMenu) pauseMenu.style.display = 'flex';
                document.exitPointerLock();
            }

            // Stop Moving Inputs
            this.game.input.keys.forward = false;
            this.game.input.keys.backward = false;
            this.game.input.keys.left = false;
            this.game.input.keys.right = false;
            this.game.input.keys.attack = false;

        } else {
            // Unpause
            if (isGameOver) {
                // Cannot unpause during game over!
                this.game.isPaused = true;
                return;
            }

            if (pauseMenu) pauseMenu.style.display = 'none';
            document.body.requestPointerLock();
            this.game.clock.getDelta(); // Reset clock
        }
    }

    toggleInventory() {
        if (!this.game.player) return;

        const invMenu = document.getElementById('inventory-menu');
        const pauseMenu = document.getElementById('pause-menu');
        const isClosed = invMenu.style.display === 'none';

        if (isClosed) {
            // Open Inventory
            this.game.isPaused = true;
            document.exitPointerLock();

            // Hide pause menu if visible
            if (pauseMenu) pauseMenu.style.display = 'none';

            invMenu.style.display = 'flex';
            this.renderInventory();
        } else {
            // Close Inventory
            invMenu.style.display = 'none';

            // Resume Game
            this.game.isPaused = false;
            document.body.requestPointerLock();

            // Reset clock safely
            this.game.clock.getDelta();
        }
    }

    renderInventory() {
        // Deprecated: Grid Inventory Removed logic.
        // We only use Hotbar now.
        this.renderHotbar();
    }

    renderHotbar() {
        const container = document.getElementById('hotbar-container');
        if (!container) return;

        // Optimization check
        const currentState = this.game.player.inventory.join(',') + ':' + this.game.player.currentSlot;
        if (this._lastHotbarState === currentState) return;
        this._lastHotbarState = currentState;

        container.innerHTML = '';

        // Fixed 3 Slots: Primary, Secondary, Melee
        this.game.player.inventory.forEach((type, i) => {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (i === this.game.player.currentSlot) slot.classList.add('active');

            // Visuals
            let content = `<span class="hotbar-key">${i + 1}</span>`;

            if (type) {
                const config = WeaponConfig[type];
                if (config) {
                    const icon = config.isMelee ? '⚔️' : '🔫';
                    content += `<div class="icon">${icon}</div><div class="name">${type.substring(0, 3)}</div>`;
                }
            } else {
                content += `<div class="name" style="opacity:0.5; font-size:10px;">EMPTY</div>`;
            }

            slot.innerHTML = content;
            container.appendChild(slot);
        });
    }

    showUpgradeScreen() {
        this.game.isPaused = true;
        document.exitPointerLock();
        this.game.input.keys.attack = false; // Stop shooting

        // WAVE COMPLETE HEAL
        const healAmount = Math.floor(this.game.player.maxHp * 0.5);
        const oldHp = this.game.player.hp;
        this.game.player.hp = Math.min(this.game.player.hp + healAmount, this.game.player.maxHp);
        const healed = Math.floor(this.game.player.hp - oldHp);

        if (healed > 0) {
            this.createFloatingText(this.game.player.position, `WAVE CLEARED: +${healed} HP`, "#00ff00");
        }

        // Update HP
        const hpPercent = (this.game.player.hp / this.game.player.maxHp) * 100;
        const hpBar = document.getElementById('hp-bar-fill');
        const hpText = document.getElementById('hp-display');

        hpBar.style.width = hpPercent + '%';
        hpText.innerText = Math.ceil(this.game.player.hp);

        // Dynamic Color
        if (hpPercent < 30) {
            hpBar.style.backgroundColor = '#ff0000'; // Critical
            hpBar.style.boxShadow = '0 0 10px #ff0000';
            // Scale effect?
            hpBar.style.height = '100%';
        } else if (hpPercent < 60) {
            hpBar.style.backgroundColor = '#ffaa00'; // Warning
            hpBar.style.boxShadow = 'none';
        } else {
            hpBar.style.backgroundColor = '#00ff00'; // Fine
            hpBar.style.boxShadow = 'none';
        }

        const upgradeScreen = document.getElementById('upgrade-screen');
        if (upgradeScreen) {
            upgradeScreen.style.display = 'flex';
            if (this.game.upgradeManager) {
                this.game.upgradeManager.showUpgrades();
            }
        }
    }

    updateMissionOverlay(text, color) {
        const el = document.getElementById('mission-overlay');
        if (el) {
            el.innerText = text;
            el.style.color = color;
            el.style.opacity = 1;
            el.style.textShadow = `0 0 20px ${color}`;
        }
    }

    createFloatingText(position, text, color) {
        const div = document.createElement('div');
        div.className = 'floating-text';
        div.innerText = text;
        div.style.color = color;
        div.style.position = 'absolute';
        div.style.fontWeight = 'bold';
        div.style.pointerEvents = 'none';
        div.style.textShadow = '1px 1px 0 #000';
        document.body.appendChild(div);

        // Project position
        const updatePos = () => {
            const vector = position.clone();
            vector.y += 1.0; // Above item
            vector.project(this.game.camera);

            const x = (vector.x * .5 + .5) * window.innerWidth;
            const y = (-(vector.y * .5) + .5) * window.innerHeight;

            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.opacity = parseFloat(div.style.opacity || 1) - 0.01;

            // Remove check
            if (parseFloat(div.style.opacity) <= 0) {
                div.remove();
                return;
            }
            requestAnimationFrame(updatePos);
        };

        div.style.opacity = '1.0';
        updatePos();

        // Timeout backup
        setTimeout(() => div.remove(), 1000);
    }

    showReflectiveDialogue() {
        // Simple HTML overlay
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.bottom = '20%';
        container.style.width = '100%';
        container.style.textAlign = 'center';
        container.style.color = '#fff';
        container.style.fontFamily = "'Courier New', monospace";
        container.style.fontSize = '24px';
        container.style.textShadow = '0 0 10px #000';
        container.style.opacity = '0';
        container.style.transition = 'opacity 2s';
        document.body.appendChild(container);

        const lines = [
            "Systems critical...",
            "Threat neutralized.",
            "But at what cost?",
            "..."
        ];

        let index = 0;
        const showLine = () => {
            if (index >= lines.length) {
                // End
                setTimeout(() => {
                    container.style.opacity = 0;
                    setTimeout(() => {
                        container.remove();
                        // Return to menu or continue?
                        // Let's continue for now or end demo.
                        alert("MISSION ACCOMPLISHED. RETURNING TO BASE.");
                        location.reload();
                    }, 2000);
                }, 3000);
                return;
            }

            container.innerText = lines[index];
            container.style.opacity = 1;

            setTimeout(() => {
                container.style.opacity = 0;
                setTimeout(() => {
                    index++;
                    showLine();
                }, 1000);
            }, 3000);
        };

        setTimeout(showLine, 1000);
    }
}
