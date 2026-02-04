import * as THREE from 'three';
import { Game } from './core/Game.js';
import { RemotePlayer } from './entities/RemotePlayer.js';

const LEADERBOARD_API = 'http://localhost:3001/api/leaderboard';
const SCORE_API = 'http://localhost:3001/api/score';

// DOM Elements
const startScreen = document.getElementById('start-screen');
const btnPlay = document.getElementById('btn-play');
const btnResume = document.getElementById('btn-resume');
const inputName = document.getElementById('player-name');
const inputSkin = document.getElementById('player-skin');
const leaderboardList = document.getElementById('leaderboard-list');
const championDisplay = document.getElementById('champion-display');

let gameInstance = null;
let playerSkinURL = null; // Store loaded skin

// --- skin loading ---
inputSkin.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            playerSkinURL = evt.target.result; // Base64
        };
        reader.readAsDataURL(file);
    }
});

// --- Fetch Leaderboard ---
async function fetchLeaderboard() {
    try {
        const res = await fetch(LEADERBOARD_API);
        const scores = await res.json();
        renderLeaderboard(scores);

    } catch (err) {
        console.error("Leaderboard error:", err);
        leaderboardList.innerHTML = '<li class="loading-text" style="color: #f00">OFFLINE</li>';
        championDisplay.innerHTML = '<span style="color: #444">SERVER ERROR</span>';
    }
}

function renderLeaderboard(scores) {
    leaderboardList.innerHTML = '';
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<li class="loading-text">NO SCORES YET</li>';
        return;
    }

    // Filter unique names (Keep highest score)
    const uniqueScores = new Map();
    scores.forEach(entry => {
        if (!uniqueScores.has(entry.name) || uniqueScores.get(entry.name).score < entry.score) {
            uniqueScores.set(entry.name, entry);
        }
    });
    
    // Sort descending
    const sortedScores = Array.from(uniqueScores.values()).sort((a, b) => b.score - a.score);

    // Initial Champion Render Update
    if (sortedScores.length > 0) {
        render3DChampion(sortedScores[0]);
    }

    sortedScores.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
            <span>#${index + 1} ${entry.name}</span>
            <span>${entry.score}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

// --- 3D Champion Display ---
let championApp = null;
let championRobot = null;

function render3DChampion(champion) {
    const container = document.getElementById('champion-display');
    if (!container) return;

    // Update Label
    const label = document.querySelector('.champion-label');
    if (label) label.innerText = `CHAMPION: ${champion.name || "UNKNOWN"}`;

    // Initialize 3D Scene if needed
    if (!championApp) {
        championApp = {};
        championApp.scene = new THREE.Scene();
        championApp.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        championApp.camera.position.set(0, 5.5, 5);
        championApp.camera.lookAt(0, 5.5, 0);

        championApp.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        championApp.renderer.setSize(container.clientWidth, container.clientHeight);
        championApp.renderer.setClearColor(0x000000, 0); // Transparent
        
        container.innerHTML = '';
        container.appendChild(championApp.renderer.domElement);

        // Lights
        const light = new THREE.DirectionalLight(0xffffff, 1.2);
        light.position.set(2, 5, 5);
        championApp.scene.add(light);
        championApp.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // Start Animation Loop
        animateChampion();
    }

    // Clear Previous Mesh logic? RemotePlayer adds to scene.
    if (championRobot) {
        championRobot.remove();
    }

    // Determine Skin
    let skin = champion.skin;
    if (!skin) {
        // Generate Cute Face
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffff00'; // Yellow
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#000';
        // Left Eye
        ctx.beginPath(); ctx.arc(40, 50, 10, 0, Math.PI * 2); ctx.fill();
        // Right Eye
        ctx.beginPath(); ctx.arc(88, 50, 10, 0, Math.PI * 2); ctx.fill();
        // Smile
        ctx.beginPath(); ctx.arc(64, 70, 30, 0, Math.PI, false); ctx.stroke();
        skin = canvas.toDataURL();
    }

    championRobot = new RemotePlayer(championApp.scene, 'champion', { 
        name: champion.name, 
        skin: skin 
    });
    
    // Scale up slightly for menu
    championRobot.mesh.scale.set(1.2, 1.2, 1.2);
}

function animateChampion() {
    requestAnimationFrame(animateChampion);
    if (championApp && championRobot && championRobot.mesh) {
        // Mouse Tracking
        // We need mouse position relative to window center?
        // Let's use global mouse from event listener
        if (window.mousePos) {
            const dx = (window.mousePos.x - window.innerWidth / 2) / (window.innerWidth / 2); // -1 to 1
            const dy = (window.mousePos.y - window.innerHeight / 2) / (window.innerHeight / 2); 

            // Rotate Head (Child index 1 in RemotePlayer _init)
            // 0: Torso, 1: HeadGroup ...
            // Correct.
            const head = championRobot.mesh.children[1];
            if (head) {
               head.rotation.y = dx * 0.5;
               head.rotation.x = dy * 0.5;
            }
            
            // Subtle Body Rotation
            championRobot.mesh.rotation.y = dx * 0.2;
        }
        
        championApp.renderer.render(championApp.scene, championApp.camera);
    }
}

// Track Mouse globally for menu effects
window.mousePos = { x: 0, y: 0 };
document.addEventListener('mousemove', (e) => {
    window.mousePos.x = e.clientX;
    window.mousePos.y = e.clientY;
});

// --- Start Game ---
btnPlay.addEventListener('click', () => {
    const playerName = inputName.value || "Soldier";
    startGame(playerName);
});

if (btnResume) {
    btnResume.addEventListener('click', () => {
        if (gameInstance) {
            gameInstance.togglePause();
        }
    });
}

const startGame = (playerName) => {
    // Hide UI
    startScreen.style.display = 'none';

    // Lock Pointer
    document.body.requestPointerLock();

    // Start Game
    if (!gameInstance) {
        gameInstance = new Game('SP', { name: playerName, skin: playerSkinURL });
    } else {
        // Reset if needed, or just unpause? 
        // For now, reload page is safer for full reset, but let's try to reuse if allowed.
        // Actually Game.js might not support restart easily. 
        // Game Over screen usually has "location.reload()".
    }
};

// Initial Load
fetchLeaderboard();
// Refresh every 10s
setInterval(fetchLeaderboard, 10000);

// Export for internal use (Game Over submission)
window.submitScore = async (score) => {
    const name = inputName.value || "Soldier";
    const statusMsg = document.getElementById('submission-status');
    if (statusMsg) statusMsg.innerText = "Submitting Score...";

    try {
        await fetch(SCORE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                score: score,
                skin: playerSkinURL
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
