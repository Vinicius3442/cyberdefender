import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.getElementById('btn-play');
    const btnHost = document.getElementById('btn-host');
    const btnJoin = document.getElementById('btn-join');
    const btnStartMp = document.getElementById('btn-start-mp');
    const inputJoin = document.getElementById('join-id');
    const displayHostId = document.getElementById('host-id-display');

    const btnConfig = document.getElementById('btn-config');
    const inputName = document.getElementById('player-name');
    const inputSkin = document.getElementById('player-skin');
    const startScreen = document.getElementById('start-screen');

    let gameInstance = null;
    let playerSkinURL = null;
    let mpMode = null; // 'HOST' or 'JOIN'

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

    const startGame = (mode, params = {}) => {
        const playerName = inputName.value || "Soldier";
        // Logic moved: Pointer lock only on match start for MP
        if (mode === 'SP') {
            document.body.requestPointerLock();
            startScreen.style.display = 'none';
        } else {
            // Show Lobby UI
            const menuContainer = document.querySelector('.menu-container');
            if (menuContainer) menuContainer.style.display = 'none';

            const lobbyScreen = document.getElementById('lobby-screen');
            lobbyScreen.style.display = 'flex';

            if (mode === 'MP' && params.host) {
                document.getElementById('btn-start-match').style.display = 'block';
                document.getElementById('lobby-msg').style.display = 'none';
                // Add self to list immediately
                updateLobbyList([{ name: playerName + " (You)" }]);
            } else {
                document.getElementById('btn-start-match').style.display = 'none';
                document.getElementById('lobby-msg').style.display = 'block';
                updateLobbyList([{ name: "Joining..." }]);
            }
        }

        if (!gameInstance) {
            gameInstance = new Game(mode, { ...params, name: playerName, skin: playerSkinURL });
        }
    };

    btnPlay.addEventListener('click', () => {
        startGame('SP');
    });

    // MP UI Logic
    // Auto-connect to Master Server on load (lazy way to check status)
    // Actually, we'll do it when they click MP buttons to avoid spam

    btnHost.addEventListener('click', () => {
        const inputHostId = document.getElementById('host-id-input');
        if (inputHostId.style.display === 'none') {
            document.getElementById('join-section').style.display = 'none';
            inputHostId.style.display = 'block';
            inputHostId.focus();
        } else {
            mpMode = 'HOST';
            const customId = inputHostId.value.trim() || null;
            startGame('MP', { host: true, id: customId });
        }
    });

    btnJoin.addEventListener('click', () => {
        const joinSection = document.getElementById('join-section');
        if (joinSection.style.display === 'none') {
            document.getElementById('host-id-input').style.display = 'none';
            joinSection.style.display = 'block';
            refreshRoomList();
        } else {
            // If manual ID is entered
            const hostId = inputJoin.value;
            if (hostId) {
                startGame('MP', { host: false, hostId: hostId });
            }
        }
    });

    document.getElementById('btn-refresh-rooms').addEventListener('click', refreshRoomList);

    function refreshRoomList() {
        const listContainer = document.getElementById('room-list');
        listContainer.innerHTML = '<p style="padding: 5px; color: #888;">Scanning...</p>';

        // We need a temporary NetworkManager to check list if not started game
        // Or we can just use fetch directly since listMatches is stateless-ish w.r.t peer instance
        // but it needs the peerjs server config.
        // Let's manually fetch here to keep it simple

        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const port = 3001;
        const path = '/myapp/peerjs/peers';

        fetch(`${protocol}//${host}:${port}${path}`)
            .then(res => res.json())
            .then(peers => {
                listContainer.innerHTML = '';
                if (peers.length === 0) {
                    listContainer.innerHTML = '<p style="padding: 5px; color: #888;">No rooms found.</p>';
                    return;
                }
                peers.forEach(id => {
                    const div = document.createElement('div');
                    div.style.padding = '5px';
                    div.style.borderBottom = '1px solid #333';
                    div.style.cursor = 'pointer';
                    div.style.color = '#0f0';
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.innerHTML = `<span>${id}</span> <span style="background:#00f; padding: 2px 5px; border-radius:3px;">JOIN</span>`;
                    div.onclick = () => {
                        startGame('MP', { host: false, hostId: id });
                    };
                    listContainer.appendChild(div);
                });
                // Update Status
                document.getElementById('server-status').innerText = "Server: Online (" + peers.length + " peers)";
                document.getElementById('server-status').style.color = "#0f0";
            })
            .catch(err => {
                console.error(err);
                listContainer.innerHTML = '<p style="padding: 5px; color: #f00;">Server Error. Check Firewall.</p>';
                document.getElementById('server-status').innerText = "Server: Unreachable (Port 9000 blocked?)";
                document.getElementById('server-status').style.color = "#f00";
            });
    }

    document.getElementById('btn-start-match').addEventListener('click', () => {
        if (gameInstance) gameInstance.startMatch();
    });

    document.getElementById('btn-copy-id').addEventListener('click', () => {
        const idText = document.getElementById('lobby-room-id').innerText;
        navigator.clipboard.writeText(idText).then(() => {
            const originalText = document.getElementById('btn-copy-id').innerText;
            document.getElementById('btn-copy-id').innerText = "COPIED!";
            setTimeout(() => document.getElementById('btn-copy-id').innerText = originalText, 2000);
        });
    });

    // Listen for Game Events
    window.addEventListener('mp-host-ready', (e) => {
        const id = e.detail.id;
        document.getElementById('lobby-room-id').innerText = id;
    });

    window.addEventListener('mp-player-list', (e) => {
        updateLobbyList(e.detail.players);
    });

    function updateLobbyList(players) {
        const list = document.getElementById('lobby-player-list');
        list.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p.name || "Unknown";
            list.appendChild(li);
        });
        document.getElementById('lobby-count').innerText = players.length;
    }

    btnConfig.addEventListener('click', () => {
        alert("Configuration Menu - Coming Soon!");
    });
});
