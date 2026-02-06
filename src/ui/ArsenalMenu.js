import { WeaponConfig, WeaponType } from '../core/WeaponSystem.js';

export class ArsenalMenu {
    constructor(game, onStart) {
        this.game = game;
        this.onStart = onStart;
        this.container = null;
        this.selectedWeapons = [WeaponType.PISTOL]; // Default loadout
        this.maxWeapons = 2; // Primary + Secondary
    }

    show() {
        this.createDOM();
        document.exitPointerLock(); // Free mouse for menu
    }

    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        document.body.requestPointerLock();
    }

    createDOM() {
        this.container = document.createElement('div');
        this.container.id = 'arsenal-menu';
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#111',
            display: 'flex',
            flexDirection: 'row',
            zIndex: '2000',
            color: '#0f0',
            fontFamily: 'monospace'
        });

        // --- LEFT PANEL: Gunsmith ---
        const leftPanel = document.createElement('div');
        Object.assign(leftPanel.style, {
            width: '30%',
            borderRight: '2px solid #0f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        });

        // Gunsmith Visual (CSS Robot)
        const robotVis = document.createElement('div');
        Object.assign(robotVis.style, {
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '4px solid #0f0',
            position: 'relative',
            marginBottom: '20px',
            boxShadow: '0 0 20px #0f0'
        });
        
        // Eyes
        const eyeL = document.createElement('div');
        const eyeR = document.createElement('div');
        const eyeStyle = {
            width: '30px', height: '30px', backgroundColor: '#0f0', borderRadius: '50%',
            position: 'absolute', top: '40px'
        };
        Object.assign(eyeL.style, eyeStyle, { left: '30px' });
        Object.assign(eyeR.style, eyeStyle, { right: '30px' });
        robotVis.appendChild(eyeL);
        robotVis.appendChild(eyeR);

        // Mouth (Canvas or div)
        const mouth = document.createElement('div');
        Object.assign(mouth.style, {
            width: '80px', height: '10px', backgroundColor: '#0f0',
            position: 'absolute', bottom: '40px', left: '35px'
        });
        robotVis.appendChild(mouth);

        leftPanel.appendChild(robotVis);

        // Dialog
        const dialog = document.createElement('div');
        dialog.innerText = "GUNSMITH: \"Pick your tools, meatbag. ED-209 is waiting.\"";
        Object.assign(dialog.style, {
            textAlign: 'center',
            fontSize: '18px',
            textShadow: '0 0 5px #0f0'
        });
        leftPanel.appendChild(dialog);

        this.container.appendChild(leftPanel);

        // --- RIGHT PANEL: Weapon Grid ---
        const rightPanel = document.createElement('div');
        Object.assign(rightPanel.style, {
            width: '70%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column'
        });

        const title = document.createElement('h2');
        title.innerText = "ARSENAL (SELECT 2)";
        rightPanel.appendChild(title);

        // Loadout Display
        this.loadoutDisplay = document.createElement('div');
        this.updateLoadoutDisplay();
        rightPanel.appendChild(this.loadoutDisplay);

        // Grid
        const grid = document.createElement('div');
        Object.assign(grid.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '10px',
            overflowY: 'auto',
            marginTop: '20px'
        });

        Object.values(WeaponType).forEach(type => {
            const btn = document.createElement('button');
            const cfg = WeaponConfig[type];
            btn.innerText = type;
            Object.assign(btn.style, {
                padding: '10px',
                border: '1px solid #0f0',
                backgroundColor: '#000',
                color: '#0f0',
                cursor: 'pointer',
                fontFamily: 'monospace'
            });

            // Hover info
            btn.title = `DMG: ${cfg.damage} | RPM: ${(60/cfg.fireRate).toFixed(0)}`;

            btn.onclick = () => this.toggleWeapon(type);
            grid.appendChild(btn);
        });

        rightPanel.appendChild(grid);

        // Fight Button
        const fightBtn = document.createElement('button');
        fightBtn.innerText = "START FIGHT >>";
        Object.assign(fightBtn.style, {
            marginTop: 'auto',
            padding: '20px',
            backgroundColor: '#0f0',
            color: '#000',
            fontSize: '24px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer'
        });
        fightBtn.onclick = () => {
            this.hide();
            if (this.onStart) this.onStart(this.selectedWeapons);
        };
        rightPanel.appendChild(fightBtn);

        this.container.appendChild(rightPanel);
        document.body.appendChild(this.container);
    }

    toggleWeapon(type) {
        if (this.selectedWeapons.includes(type)) {
            this.selectedWeapons = this.selectedWeapons.filter(t => t !== type);
        } else {
            if (this.selectedWeapons.length < this.maxWeapons) {
                this.selectedWeapons.push(type);
            } else {
                // Replace last?
                this.selectedWeapons.pop();
                this.selectedWeapons.push(type);
            }
        }
        this.updateLoadoutDisplay();
    }

    updateLoadoutDisplay() {
        if (this.loadoutDisplay) {
            this.loadoutDisplay.innerText = `LOADOUT: [ ${this.selectedWeapons.join(' | ')} ]`;
            Object.assign(this.loadoutDisplay.style, {
                padding: '10px',
                border: '1px dashed #0f0',
                marginBottom: '10px'
            });
        }
    }
}
