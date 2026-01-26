import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.getElementById('btn-play');
    const btnConfig = document.getElementById('btn-config');
    const inputName = document.getElementById('player-name');
    const inputSkin = document.getElementById('player-skin');
    const startScreen = document.getElementById('start-screen');

    let gameInstance = null;
    let playerSkinURL = null;

    // Handle Skin Upload
    inputSkin.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                playerSkinURL = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    btnPlay.addEventListener('click', () => {
        const playerName = inputName.value || "Soldier";

        // Request Pointer Lock immediately
        document.body.requestPointerLock();

        // Hide Menu
        startScreen.style.display = 'none';

        // Start Game
        if (!gameInstance) {
            gameInstance = new Game(playerName, playerSkinURL);
        } else {
            // If restarting? For now just reload page for full restart is safer
            // But if we wanted to restart logic:
            // gameInstance.restart(playerName, playerSkinURL);
        }
    });

    btnConfig.addEventListener('click', () => {
        alert("Configuration Menu - Coming Soon!");
    });
});
