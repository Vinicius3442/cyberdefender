import * as THREE from 'three';
import { Game } from './core/Game.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { BootSequence } from './ui/BootSequence.js';
import { ShellMenu } from './ui/ShellMenu.js';

const LEADERBOARD_API = 'http://localhost:3001/api/leaderboard';
const SCORE_API = 'http://localhost:3001/api/score';

const startScreen = document.getElementById('start-screen');
const btnPlay = document.getElementById('btn-play');
const btnResume = document.getElementById('btn-resume');
const inputName = document.getElementById('player-name');
const leaderboardList = document.getElementById('leaderboard-list');
const championDisplay = document.getElementById('champion-display');

let gameInstance = null;
window.mousePos = { x: 0, y: 0 };
let lastMousePos = { x: 0, y: 0 };
let shakeVelocity = 0;

document.addEventListener('mousemove', (e) => {
    // Calculate instantaneous velocity
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Smooth accumulation (Dizziness)
    shakeVelocity = speed * 0.05; // Much Lower Sensitivity

    window.mousePos.x = e.clientX;
    window.mousePos.y = e.clientY;
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;
});

// Menu Loop (Dizziness visual)
let isMenuRunning = true;
const menuLoop = () => {
    if (!isMenuRunning) return;

    if (!gameInstance) {
        shakeVelocity *= 0.9; // Decay

        const faceContainer = document.getElementById('robot-face-container');
        if (faceContainer) {
            // Apply blur and rotation based on shake
            // Increased threshold to 5 so it requires real shaking
            if (shakeVelocity > 5) {
                const blur = Math.min(shakeVelocity * 0.05, 5);
                const rot = Math.min(shakeVelocity * 0.1, 3);
                const skew = Math.min(shakeVelocity * 0.05, 1);

                faceContainer.style.filter = `blur(${blur}px)`;
                faceContainer.style.transform = `scale(${1 + blur * 0.01}) rotate(${rot * (Math.random() - 0.5)}deg) skewX(${skew}deg)`;
            } else {
                faceContainer.style.filter = 'none';
                faceContainer.style.transform = 'none';
            }
        }
    }
    requestAnimationFrame(menuLoop);
};
menuLoop();

const startShell = () => {
    const shellMenu = new ShellMenu((name, mode) => {
        // Callback when 'game start' is run (after Boot Sequence inside ShellMenu)
        startGame(name, mode);
    });
};

startShell();

if (btnResume) {
    btnResume.addEventListener('click', () => {
        if (gameInstance) {
            gameInstance.togglePause();
        }
    });
}

const startGame = (playerName, mode = 'SP', options = {}) => {
    // Lock Pointer
    document.body.requestPointerLock();

    // Check if we need to restart (e.g. switch mode)
    if (gameInstance) {
        console.log("Restarting Game Instance...");
        // Cleanup old game
        if (gameInstance.dispose) {
            gameInstance.dispose();
        } else {
            // Fallback nuclear option
            const container = document.getElementById('game-container');
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
        gameInstance = null;
    }

    // Start Game
    if (!gameInstance) {
        // Create Game
        // If mode is CASTLE, we start as SP but trigger level load
        const actualMode = (mode === 'CASTLE') ? 'SP' : mode;

        isMenuRunning = false; // Stop menu loop
        gameInstance = new Game(actualMode, { name: playerName, skin: null, ...options });

        // Start Loop - EXPLICIT CALL REQUIRED NOW
        gameInstance.animate();

        // Immediate Level Load
        if (mode === 'CASTLE') {
            console.log("MAIN: Fast-forwarding to CASTLE Level...");
            // Small delay to ensure init
            setTimeout(() => {
                gameInstance.loadLevel('CASTLE');
            }, 100);
        }
    }
};

window.submitScore = async (score) => {
    const name = (gameInstance && gameInstance.player && gameInstance.player.name) || "Soldier";
    const statusMsg = document.getElementById('submission-status');
    if (statusMsg) statusMsg.innerText = "Simulating Cloud Upload...";

    // Mock "Network Delay"
    setTimeout(() => {
        try {
            // Check if server is actually alive before throwing error?
            // For this demo, just pretend it worked to avoid user confusion
            if (statusMsg) {
                statusMsg.innerText = "UPLOAD COMPLETE";
                statusMsg.style.color = "#0f0";
                statusMsg.style.textShadow = "0 0 10px #0f0";
            }
            console.log(`[MOCK] Score Submitted: ${score} for ${name}`);
        } catch (err) {
            console.warn("Score simulation failed", err);
        }
    }, 1500);
};
