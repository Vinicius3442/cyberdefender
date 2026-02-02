import { Game } from './core/Game.js';

const LEADERBOARD_API = 'http://10.134.227.121:3001/api/leaderboard';
const SCORE_API = 'http://10.134.227.121:3001/api/score';

// DOM Elements
const startScreen = document.getElementById('start-screen');
const btnPlay = document.getElementById('btn-play');
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
        renderChampion(scores[0]);
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

    scores.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
            <span>#${index + 1} ${entry.name}</span>
            <span>${entry.score}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

function renderChampion(champion) {
    if (!champion || !champion.skin) {
        championDisplay.innerHTML = '<span style="color: #444">NO CHAMPION</span>';
        return;
    }
    // Render skin image
    championDisplay.innerHTML = '';
    const img = document.createElement('img');
    img.src = champion.skin;
    img.alt = "Champion Skin";
    championDisplay.appendChild(img);

    // Update label
    const label = document.querySelector('.champion-label');
    if (label) label.innerText = `CHAMPION: ${champion.name}`;
}

// --- Start Game ---
btnPlay.addEventListener('click', () => {
    const playerName = inputName.value || "Soldier";
    startGame(playerName);
});

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
