
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
        
        // Click to Open Shell
        this.faceContainer.addEventListener('click', () => {
            this.faceContainer.style.display = 'none';
            this.shellContainer.style.display = 'block';
            this.renderNeofetch();
            this.input.focus();
        });
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
                this.print("  start [name]  - Launch connection to server");
                this.print("  fetch         - Refresh system status");
                this.print("  clear         - Clear terminal");
                break;
                
            case 'clear':
                this.output.innerHTML = '';
                break;
                
            case 'fetch':
                this.renderNeofetch();
                break;
                
            case 'start':
            case 'game': // Handle 'game start'
                if (cmd === 'game' && args[0] !== 'start') {
                    this.print("Did you mean 'game start'?");
                    break;
                }
                
                const name = (cmd === 'game' ? args[1] : args[0]) || this.playerName;
                this.playerName = name;
                this.startGame();
                break;
                
            default:
                if (raw.trim()) this.print(`Command not found: ${cmd}`);
        }
    }
    
    startGame() {
        this.active = false; // Stop face anim
        this.shellContainer.style.display = 'none';
        
        // Trigger Boot Sequence via callback
        const bootSeq = new BootSequence(() => {
            this.startGameCallback(this.playerName);
        });
        bootSeq.start();
    }
}
