export class CinematicManager {
    constructor(game) {
        this.game = game;
        this.container = null;
    }

    triggerNuclearCinematic(e) {
        // e might contain boss position etc.
        console.log("CINEMATIC: Starting Nuclear Sequence");
        this.game.isCinematic = true;
        this.game.input.enabled = false;
        document.exitPointerLock();

        // 1. NUCLEAR FLASH (Intense Whiteout)
        const flash = document.createElement('div');
        Object.assign(flash.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'white', zIndex: '9999', transition: 'opacity 2s'
        });
        document.body.appendChild(flash);
        
        // Massive Screen Shake via Player
        if (this.game.player) {
            this.game.player.shakeTime = 4.0;
            this.game.player.shakeIntensity = 2.0;
        }

        // Fade out flash
        requestAnimationFrame(() => { flash.style.opacity = '0'; });
        setTimeout(() => flash.remove(), 2000);

        // 2. The CRT Terminal Overlay
        this.createTerminalOverlay();

        // 3. Debris Art (CSS)
        this.createDebrisArt();

        // 4. End Sequence logic (Transition to Level 2?)
        setTimeout(() => {
            this.game.loadLevel('CASTLE');
            this.cleanup();
        }, 8000); // 8 seconds of gloating
    }

    createTerminalOverlay() {
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute', bottom: '20%', width: '100%',
            textAlign: 'center', color: '#0f0',
            fontFamily: "'Courier New', monospace",
            fontSize: '24px', textShadow: '0 0 10px #0f0',
            zIndex: '5000', pointerEvents: 'none'
        });
        document.body.appendChild(this.container);

        const lines = [
            "CRITICAL MASS EXCEEDED...",
            "CORE MELTDOWN IMMINENT.",
            "THREAT NEUTRALIZED.",
            "ACCESSING ARCHIVES..."
        ];

        let index = 0;
        const interval = setInterval(() => {
            if (index >= lines.length) {
                clearInterval(interval);
                return;
            }
            const p = document.createElement('div');
            p.innerText = lines[index++];
            this.container.appendChild(p);
        }, 1500);
    }

    createDebrisArt() {
        // Simple SVG or CSS Art representing the destruction
        // Placeholder for now, user liked the "Robot Debris" art previously manually added in Game.js
        // We can replicate or improve here.
    }

    cleanup() {
        if (this.container) this.container.remove();
        this.game.isCinematic = false;
        // Input re-enabled by Level load usually
    }
}
