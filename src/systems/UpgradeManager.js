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
        // Only STAT upgrades now, weapons are from Chests
        const possibleTypes = ['STAT'];

        for (let i = 0; i < 3; i++) {
            const stats = [
                { id: 'hp', title: 'Max HP +20', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
                { id: 'speed', title: 'Speed +10%', apply: (p) => { p.speed *= 1.1; } },
                { id: 'jump', title: 'Jump +10%', apply: (p) => { p.jumpForce *= 1.1; } },
                {
                    id: 'damage', title: 'Damage +10%', apply: (p) => {
                        // We need to handle damage multiplier in Player or WeaponSystem
                        // For now let's just heal
                        p.hp = Math.min(p.hp + 50, p.maxHp);
                    }, titleOverride: 'Heal 50 HP'
                }
            ];

            const stat = stats[Math.floor(Math.random() * stats.length)];
            options.push({
                title: stat.titleOverride || stat.title,
                description: "Improves player stats.",
                action: () => stat.apply(this.game.player)
            });
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
