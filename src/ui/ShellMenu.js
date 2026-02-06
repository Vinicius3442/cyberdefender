
import { BootSequence } from './BootSequence.js';

export class ShellMenu {
    constructor(startGameCallback) {
        this.startGameCallback = startGameCallback;
        
        // DOM Elements
        this.faceContainer = document.getElementById('robot-face-container');
        this.faceCanvas = document.getElementById('robot-face-canvas');
        this.shellContainer = document.getElementById('shell-container');
        this.output = document.getElementById('shell-output');
        this.input = document.getElementById('shell-input');
        this.input = document.getElementById('shell-input');
        
        // State
        this.active = true;
        this.playerName = "Soldier";

        
        // Init
        this.initFace();
        this.initShell();
    }
    
    // --- Robot Face (Canvas) ---
    initFace() {
        this.ctx = this.faceCanvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Face Loop
        this.faceState = {
            blink: 0,
            eyeX: 0,
            eyeY: 0
        };
        
        this.animateFace();
        
        // Mouse Tracking
        document.addEventListener('mousemove', (e) => {
            if (!this.active || this.shellContainer.style.display !== 'none') return;
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            this.faceState.eyeX = (e.clientX - cx) / cx; // -1 to 1
            this.faceState.eyeY = (e.clientY - cy) / cy;
        });
        
        // Click to Open Shell (Trigger Boot Screen first)
        this.faceContainer.addEventListener('click', () => {
            this.faceContainer.style.display = 'none';
            this.playOSBootSequence(); 
        });
    }
    
    playOSBootSequence() {
        const bootScreen = document.getElementById('os-boot-screen');
        const barFill = document.getElementById('boot-bar-fill');
        const statusText = document.getElementById('boot-status');
        
        bootScreen.style.display = 'flex';
        
        const steps = [
            { t: 0, text: "INITIALIZING..." },
            { t: 500, text: "MOUNTING VOLUMES [C:/ROOT]" },
            { t: 1200, text: "LOADING DRIVERS: NEURAL_NET.SYS" },
            { t: 2000, text: "CHECKING PERIPHERALS... OK" },
            { t: 2800, text: "ESTABLISHING SECURE CONNECTION..." },
            { t: 3500, text: "ACCESS GRANTED" }
        ];
        
        let startTime = performance.now();
        const duration = 4000;
        
        const updateBoot = () => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            barFill.style.width = `${progress * 100}%`;
            
            // Find current text step
            const step = steps.slice().reverse().find(s => elapsed >= s.t);
            if (step) statusText.innerText = step.text;
            
            if (progress < 1) {
                requestAnimationFrame(updateBoot);
            } else {
                // Done
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                    this.shellContainer.style.display = 'block';
                    this.renderNeofetch();
                    this.input.focus();
                }, 500);
            }
        };
        requestAnimationFrame(updateBoot);
    }
    
    resize() {
        this.faceCanvas.width = window.innerWidth;
        this.faceCanvas.height = window.innerHeight;
    }
    
    animateFace() {
        if (!this.active) return;
        requestAnimationFrame(() => this.animateFace());
        
        const w = this.faceCanvas.width;
        const h = this.faceCanvas.height;
        const ctx = this.ctx;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        // Random Blink
        if (Math.random() < 0.01) this.faceState.blink = 10;
        if (this.faceState.blink > 0) this.faceState.blink--;
        
        const eyeW = 150;
        const eyeH = this.faceState.blink > 0 ? 10 : 150; // Blink squash
        
        const offsetX = this.faceState.eyeX * 30;
        const offsetY = this.faceState.eyeY * 30;
        
        ctx.fillStyle = '#4af626'; // Matrix Green
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4af626';
        
        // Left Eye
        this.drawRect(ctx, w/2 - 200 + offsetX, h/2 - 75 + offsetY, eyeW, eyeH);
        
        // Right Eye
        this.drawRect(ctx, w/2 + 50 + offsetX, h/2 - 75 + offsetY, eyeW, eyeH);
        
        ctx.shadowBlur = 0;
    }
    
    drawRect(ctx, x, y, w, h) {
        ctx.fillRect(x, y + (150 - h)/2, w, h);
    }
    
    // --- Shell Terminal ---
    initShell() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = this.input.value.trim();
                this.input.value = '';
                this.processCommand(cmd);
            }
        });
        
        // Click anywhere to focus input
        this.shellContainer.addEventListener('click', () => this.input.focus());
    }
    
    async renderNeofetch() {
        const scores = await this.fetchLeaderboardData();
        const top = scores[0] ? `${scores[0].name} (${scores[0].score})` : "None";
        
        // ASCII Art
        const art = [
            "       .---.       ",
            "      /     \\      ",
            "      | O O |      ",
            "      \\  ^  /      ",
            "       `---`       "
        ];
        
        const info = [
            `USER:       ${this.playerName || 'Guest'}`,
            `OS:         CyberOS v9.0`,
            `KERNEL:     NeuralNet 5.2`,
            `--------------------------`,
            `CHAMPION:   ${top}`,
            `UPTIME:     ${Math.floor(performance.now()/1000)}s`,
            ``,
            `Type 'help' for commands.`
        ];
        
        let output = "";
        for(let i=0; i<Math.max(art.length, info.length); i++) {
            const a = art[i] || "                   ";
            const b = info[i] || "";
            output += `<span style="color:#4af626">${a}</span>  <span style="color:#fff">${b}</span>\n`;
        }
        
        this.output.innerHTML = output + "\n";
    }
    
    // Reusing fetch logic from main.js (simplified)
    async fetchLeaderboardData() {
        try {
            const res = await fetch('http://localhost:3001/api/leaderboard');
            return await res.json();
        } catch {
            return [];
        }
    }
    
    print(text) {
        const div = document.createElement('div');
        div.textContent = text;
        this.output.appendChild(div);
        this.output.scrollTop = this.output.scrollHeight;
    }
    
    processCommand(raw) {
        this.print(`guest@cyber-os:~$ ${raw}`);
        const parts = raw.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        switch(cmd) {
            case 'help':
                this.print("Available commands:");
                this.print("  start [name]   - Launch game");
                this.print("    Flags: -castle (Jump to Wave 11), -skip (Fast Start)");
                this.print("  fetch          - Refresh system status");
                this.print("  clear         - Clear terminal");
                break;
                
            case 'clear':
                this.output.innerHTML = '';
                break;
                
            case 'fetch':
                this.renderNeofetch();
                break;
                
            case 'start':
            case 'game': 
                let mode = 'SP';
                let name = this.playerName;
                let skipIntro = false;
                
                // Parse Args
                const startArgs = (cmd === 'game') ? args.slice(1) : args;
                
                for (const arg of startArgs) {
                    if (arg.startsWith('-')) {
                        // Flags
                        const flag = arg.replace(/^-+/, '').toLowerCase();
                        if (flag === 'castle') mode = 'CASTLE';
                        if (flag === 'skip' || flag === 's') skipIntro = true;
                        if (flag === 'bossrush') mode = 'BOSSRUSH';
                    } else {
                        // Name (First non-flag arg)
                        if (!name || name === "Soldier") name = arg;
                    }
                }
                
                this.playerName = name;
                
                if (mode === 'CASTLE') this.print("INITIALIZING CASTLE INSERTION...");
                
                this.startGame(mode, { skipIntro });
                break;
                
            case 'bossrush':
                this.print("INITIALIZING BOSS RUSH ARENA...");
                this.startGame('BOSSRUSH');
                break;

            case 'spawn':
                const bossName = args[0];
                if (bossName === 'ed209' || bossName === 'worm') {
                    this.print(`QUEUED DEPLOYMENT: ${bossName.toUpperCase()}`);
                    window.GAME_PARAMS = window.GAME_PARAMS || {};
                    window.GAME_PARAMS.bossQueue = bossName;
                } else {
                    this.print("Unknown entity. Try: ed209, worm");
                }
                break;

            case 'ammo':
                window.GAME_PARAMS = window.GAME_PARAMS || {};
                window.GAME_PARAMS.infiniteAmmo = true;
                this.print("CHEAT ACTIVE: Infinite Ammo");
                break;

            default:
                if (raw.trim()) this.print(`Command not found: ${cmd}`);
        }
    }
    
    startGame(mode = 'SP', options = {}) {
        this.active = false; // Stop face anim
        this.shellContainer.style.display = 'none';
        
        const bootSeq = new BootSequence(() => {
            this.startGameCallback(this.playerName, mode, options);
        });
        bootSeq.start();
    }
}
