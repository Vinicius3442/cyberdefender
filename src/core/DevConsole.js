export class DevConsole {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        
        // CSS Style Injection
        this.createStyles();

        // DOM Elements
        this.container = document.createElement('div');
        this.container.id = 'dev-console';
        this.container.innerHTML = `
            <div class="console-header">ROBOT TERMINAL V1.0</div>
            <div class="console-log" id="console-log"></div>
            <input type="text" id="console-input" placeholder="Enter command..." autocomplete="off">
        `;
        document.body.appendChild(this.container);

        this.inputField = document.getElementById('console-input');
        this.logField = document.getElementById('console-log');
        
        // Listeners
        this.setupListeners();
    }

    createStyles() {
        const css = `
            #dev-console {
                display: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 300px;
                background: rgba(0, 20, 0, 0.9);
                border-bottom: 2px solid #00ff00;
                font-family: 'Courier New', monospace;
                color: #00ff00;
                z-index: 9999;
                padding: 10px;
                box-sizing: border-box;
                flex-direction: column;
            }
            .console-header {
                font-weight: bold;
                border-bottom: 1px solid #004400;
                margin-bottom: 5px;
            }
            .console-log {
                flex-grow: 1;
                overflow-y: auto;
                font-size: 14px;
                margin-bottom: 5px;
            }
            #console-input {
                width: 100%;
                background: transparent;
                border: none;
                border-top: 1px solid #00ff00;
                color: #00ff00;
                font-family: inherit;
                font-size: 16px;
                padding: 5px;
            }
            #console-input:focus {
                outline: none;
            }
        `;
        const style = document.createElement('style');
        style.innerText = css;
        document.head.appendChild(style);
    }

    setupListeners() {
        // Toggle Key (')
        document.addEventListener('keydown', (e) => {
            if (e.key === "'" || e.key === "Process") { // Some layouts use Process or Dead key
                 e.preventDefault();
                 this.toggle();
            }
        });

        // Command Entry
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.execute(this.inputField.value);
                this.inputField.value = '';
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
        
        if (this.isVisible) {
            document.exitPointerLock();
            this.game.isPaused = true;
            this.inputField.focus();
        } else {
            this.game.isPaused = false;
            document.body.requestPointerLock();
        }
    }

    log(msg) {
        const line = document.createElement('div');
        line.innerText = `> ${msg}`;
        this.logField.appendChild(line);
        this.logField.scrollTop = this.logField.scrollHeight;
    }

    execute(cmd) {
        this.log(cmd);
        const args = cmd.trim().toLowerCase().split(' ');
        const main = args[0];

        // Check Cheats
        if (this.game.cheats[main]) {
            // Pass remaining args to the cheat function
            this.game.cheats[main](...args.slice(1));
            this.log(`Executed: ${main} ${args.slice(1).join(' ')}`);
        } else if (main === 'map') {
            this.game.loadLevel(args[1].toUpperCase());
            this.log(`Loading map: ${args[1]}`);
        } else if (main === 'spawn') {
            const type = args[1];
            if (type) {
                this.game.spawnBoss(isNaN(type) ? type : parseInt(type));
                this.log(`Spawned: ${type}`);
            }
        } else if (main === 'help') {
           this.log("CHEATS: " + Object.keys(this.game.cheats).join(', '));
           this.log("COMMANDS: map [name], spawn [type/wave], space");
        } else {
            this.log("Unknown command.");
        }
    }
}
