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

        // Render Character
        // Render Character (2D Image)
        if (this.game.player.skinURL) {
            const img = document.createElement('img');
            img.src = this.game.player.skinURL;
            this.charImgContainer.appendChild(img);
        } else {
            // Default Cute Face (Generated)
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffff00'; // Yellow
            ctx.fillRect(0, 0, 128, 128);
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(40, 50, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(88, 50, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(64, 70, 30, 0, Math.PI, false); ctx.stroke();
            
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            this.charImgContainer.appendChild(img);
        }

        const options = this.generateOptions();

        // Render Rows
        options.forEach(opt => {
            const row = document.createElement('div');
            row.className = 'upgrade-row';
            
            // Current Value?
            let currentVal = opt.getCurrent ? opt.getCurrent(this.game.player) : '-';
            if (typeof currentVal === 'number' && !Number.isInteger(currentVal)) currentVal = currentVal.toFixed(1);

            row.innerHTML = `
                <div class="stat-info">
                    <span class="stat-label">${opt.title}</span>
                    <span class="stat-value">${currentVal}</span>
                </div>
                <div class="upgrade-action">
                    <button class="upgrade-btn">UPGRADE</button>
                </div>
            `;

            const btn = row.querySelector('button');
            btn.onclick = () => {
                this.selectUpgrade(opt);
            };

            this.optionsContainer.appendChild(row);
        });
    }

    generateOptions() {
        // Define all upgradeable stats
        // We can pick 3 random ones OR list all fixed ones?
        // User asked for "stats on right". Let's show fixed stats that can be upgraded.
        // HP, Speed, Jump, Max Ammo (for all weapons?), Reload Speed?
        
        const definitions = [
            { 
                id: 'hp', title: 'MAX HEALTH', 
                getCurrent: (p) => p.maxHp, 
                apply: (p) => { p.maxHp += 20; p.hp += 20; } 
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
                    // Apply to all weapons
                    Object.keys(p.weaponState).forEach(k => {
                        const config = WeaponConfig[k]; 
                        if (config && config.maxReserve) {
                             p.weaponState[k].maxReserve = Math.floor(config.maxReserve * p.ammoMultiplier);
                             // Also refill a bit?
                             p.weaponState[k].reserve += Math.floor(config.maxReserve * 0.2); 
                        }
                    });
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
