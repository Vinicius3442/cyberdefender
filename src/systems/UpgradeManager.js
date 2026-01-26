import { WeaponType } from '../core/WeaponSystem.js';

export class UpgradeManager {
    constructor(game) {
        this.game = game;
        this.screen = document.getElementById('upgrade-screen');
        this.optionsContainer = document.getElementById('upgrade-options');
    }

    showUpgrades() {
        // Pause Game
        this.game.isPaused = true;
        document.exitPointerLock();
        this.screen.style.display = 'flex';
        this.optionsContainer.innerHTML = '';

        const options = this.generateOptions();

        options.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-title">${opt.title}</div>
                <div class="upgrade-desc">${opt.description}</div>
            `;
            card.onclick = () => {
                this.selectUpgrade(opt);
            };
            this.optionsContainer.appendChild(card);
        });
    }

    generateOptions() {
        const options = [];
        const possibleTypes = ['STAT', 'WEAPON'];

        for (let i = 0; i < 3; i++) {
            const type = Math.random() > 0.5 ? 'WEAPON' : 'STAT';

            if (type === 'STAT') {
                const stats = [
                    { id: 'hp', title: 'Max HP +20', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
                    { id: 'speed', title: 'Speed +10%', apply: (p) => { p.speed *= 1.1; } },
                    { id: 'jump', title: 'Jump +10%', apply: (p) => { p.jumpForce *= 1.1; } }
                ];
                const stat = stats[Math.floor(Math.random() * stats.length)];
                options.push({
                    title: stat.title,
                    description: "Improves player stats.",
                    action: () => stat.apply(this.game.player)
                });
            } else {
                // Random Weapon
                const weaponKeys = Object.values(WeaponType);
                const weapon = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
                options.push({
                    title: `New Weapon: ${weapon}`,
                    description: "Adds to inventory.",
                    action: () => this.game.player.addWeapon(weapon)
                });
            }
        }
        return options;
    }

    selectUpgrade(opt) {
        opt.action();
        this.close();
    }

    close() {
        this.screen.style.display = 'none';
        this.game.isPaused = false;
        document.body.requestPointerLock();
        this.game.waveManager.startNextWave();
    }
}
