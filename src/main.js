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

// --- Start Game ---
// Initialize Shell Menu
// Initialize Shell Menu

const shellMenu = new ShellMenu((name) => {
    // Callback when 'game start' is run
    startGame(name);
});

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

const startGame = (playerName) => {
    // Hide UI handled by ShellMenu/BootSequence
    // startScreen.style.display = 'none'; // Removed

    // Lock Pointer
    document.body.requestPointerLock();

    // Start Game
    if (!gameInstance) {
        gameInstance = new Game('SP', { name: playerName, skin: null });
    } else {
        // Reset if needed, or just unpause? 
        // For now, reload page is safer for full reset, but let's try to reuse if allowed.
        // Actually Game.js might not support restart easily. 
        // Game Over screen usually has "location.reload()".
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
