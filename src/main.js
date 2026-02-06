import * as THREE from 'three';
import { Game } from './core/Game.js';
import { RemotePlayer } from './entities/RemotePlayer.js';
import { BootSequence } from './ui/BootSequence.js';
import { ShellMenu } from './ui/ShellMenu.js';

const LEADERBOARD_API = 'http://localhost:3001/api/leaderboard';
const SCORE_API = 'http://localhost:3001/api/score';

// DOM Elements
// DOM Elements
const startScreen = document.getElementById('start-screen');
const btnPlay = document.getElementById('btn-play');
const btnResume = document.getElementById('btn-resume');
const inputName = document.getElementById('player-name');
const leaderboardList = document.getElementById('leaderboard-list');
const championDisplay = document.getElementById('champion-display');

let gameInstance = null;
// let playerSkinURL = null; // Removed

// --- skin loading ---
// Removed

// Track Mouse globally for menu effects
window.mousePos = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => {
    window.mousePos.x = e.clientX;
    window.mousePos.y = e.clientY;
});

// --- 3D Champion Display ---
// Logic moved to ShellMenu / Neofetch (Text only for now) or removed.
// The old DOM elements #leaderboard-list and #champion-display do not exist.

// Initialize Shell Menu
const startShell = () => {
    const shellMenu = new ShellMenu((name, mode) => {
        // Callback when 'game start' is run (after Boot Sequence inside ShellMenu)
        startGame(name, mode);
    });
};

// Start directly with Shell
startShell();

// Remove old listeners
// btnPlay.addEventListener... removed
// inputSkin etc handled by ShellMenu

if (btnResume) {
    btnResume.addEventListener('click', () => {
        if (gameInstance) {
            gameInstance.togglePause();
        }
    });
}

const startGame = (playerName, mode = 'SP') => {
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
        gameInstance = new Game(mode, { name: playerName, skin: null });
        
        // Start Loop - EXPLICIT CALL REQUIRED NOW
        gameInstance.animate();
    }
};

// Initial Load
// ShellMenu handles its own data fetching when 'fetch' command is used.
// We do not need a loop here anymore.

// Export for internal use (Game Over submission)
window.submitScore = async (score) => {
    const name = (gameInstance && gameInstance.player && gameInstance.player.name) || "Soldier";
    const statusMsg = document.getElementById('submission-status');
    if (statusMsg) statusMsg.innerText = "Submitting Score...";

    try {
        await fetch(SCORE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                score: score,
                skin: null
            })
        });
        if (statusMsg) {
            statusMsg.innerText = "Score Submitted!";
            statusMsg.style.color = "#0f0";
        }
    } catch (err) {
        console.error("Score submit error:", err);
        if (statusMsg) {
            statusMsg.innerText = "Submission Failed (Offline?)";
            statusMsg.style.color = "#f00";
        }
    }
};
