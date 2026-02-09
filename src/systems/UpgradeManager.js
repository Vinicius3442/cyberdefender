import { WeaponType, WeaponConfig } from '../core/WeaponSystem.js';

export class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('upgrade-screen');
        this.optionsContainer = document.getElementById('upgrade-options');
        this.charImgContainer = document.getElementById('upgrade-char-img-container');

        // Skip Button
        const btnSkip = document.getElementById('btn-skip-upgrade');
        if (btnSkip) {
            btnSkip.onclick = () => this.close();
        }
    }

    showUpgrades() {
        // Pause Game
        this.game.isPaused = true;
        document.exitPointerLock();
        this.screen.style.display = 'flex';
        this.optionsContainer.innerHTML = '';
        this.charImgContainer.innerHTML = '';

        // Render Character (Holographic style)
        if (this.game.player.skinURL) {
            const img = document.createElement('img');
            img.src = this.game.player.skinURL;
            img.className = 'char-preview-img';
            this.charImgContainer.appendChild(img);
        } else {
            // Green Robot Face (Matrix Style)
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 128, 128);

            // Neon Green Eyes
            ctx.fillStyle = '#4af626';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#4af626';

            // Rectangular Eyes (matches ShellMenu)
            const eyeW = 30;
            const eyeH = 30;

            // Left Eye
            ctx.fillRect(128 / 2 - 40, 128 / 2 - 15, eyeW, eyeH);
            // Right Eye
            ctx.fillRect(128 / 2 + 10, 128 / 2 - 15, eyeW, eyeH);

            ctx.shadowBlur = 0;

            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.className = 'char-preview-img';
            this.charImgContainer.appendChild(img);
        }

        const options = this.generateOptions();

        // Render Cards
        this.optionsContainer.className = 'upgrade-grid'; // Switch to grid

        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';

            // Current Value
            let currentVal = opt.getCurrent ? opt.getCurrent(this.game.player) : '-';
            if (typeof currentVal === 'number' && !Number.isInteger(currentVal)) currentVal = currentVal.toFixed(1);

            // Icon Mapping (Simple emoji for now, or CSS classes)
            const icons = {
                'hp': '❤️',
                'speed': '⚡',
                'jump': '🚀',
                'ammo': '🔋'
            };
            const icon = icons[opt.id] || '🔧';

            card.innerHTML = `
                <div class="card-icon">${icon}</div>
                <div class="card-title">${opt.title}</div>
                <div class="card-current">CURRENT: ${currentVal}</div>
                <button class="card-btn">INSTALL UPGRADE</button>
            `;

            const btn = card.querySelector('button');
            btn.onclick = () => {
                this.selectUpgrade(opt);
            };

            this.optionsContainer.appendChild(card);
        });
    }

    generateOptions() {
        const definitions = [
            {
                id: 'hp', title: 'MAX HEALTH',
                getCurrent: (p) => p.maxHp,
                apply: (p) => {
                    p.maxHp += 20;
                    p.hp += 20;
                    // Force UI Update
                    const hpDisp = document.getElementById('hp-display');
                    if (hpDisp) hpDisp.innerText = Math.floor(p.hp);
                }
            },
            {
                id: 'speed', title: 'MOVEMENT SPEED',
                getCurrent: (p) => p.speed,
                apply: (p) => { p.speed *= 1.1; }
            },
            {
                id: 'jump', title: 'JUMP FORCE',
                getCurrent: (p) => p.jumpForce,
                apply: (p) => { p.jumpForce *= 1.1; }
            },
            {
                id: 'ammo', title: 'AMMO CAPACITY',
                getCurrent: (p) => "x" + (p.ammoMultiplier || 1).toFixed(1),
                apply: (p) => {
                    p.ammoMultiplier = (p.ammoMultiplier || 1) + 0.2;
                    // Apply to all weapons safely
                    if (p.weaponState) {
                        Object.keys(p.weaponState).forEach(k => {
                            const config = WeaponConfig[k];
                            if (config && config.maxReserve) {
                                p.weaponState[k].maxReserve = Math.floor(config.maxReserve * p.ammoMultiplier);
                                p.weaponState[k].reserve += Math.floor(config.maxReserve * 0.2);
                            }
                        });
                    }
                }
            }
        ];
        return definitions;
    }

    selectUpgrade(opt) {
        opt.apply(this.game.player);
        this.close();
    }

    close() {
        this.screen.style.display = 'none';
        this.game.isPaused = false;
        document.body.requestPointerLock();
        this.game.waveManager.startNextWave();
    }
}
