export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.conn = null; // For Client: connection to Host
        this.connections = {}; // For Host: map of id -> connection
        this.peerId = null;
        this.isHost = false;

        // Event Callbacks
        this.onPlayerConnect = null;
        this.onPlayerDisconnect = null;
        this.onDataReceived = null;
        this.onConnectionListUpdate = null; // New callback
        this.playersInfo = {}; // id -> { name, skin }
    }

    init(id = null) {
        // USE LOCAL SERVER CONFIG
        // This requires running `npx peerjs --port 9000` on the HOST machine.
        // And clients must connect to the Host's IP.

        const isLocal = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        // Simple heuristic: if we are on a private IP (10.x, 192.x), assume LAN and try to use the location.hostname as the server

        const peerConfig = {
            host: window.location.hostname, // Connect to the server that served the page
            port: 8000,
            path: '/myapp',
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            }
        };

        // Fallback to Cloud if not on LAN? Or just force LAN for this user case?
        // User is blocked from Cloud, so let's force LAN.

        console.log("Initializing PeerJS with config:", peerConfig);

        this.peer = new Peer(id, peerConfig);

        this.peer.on('open', (id) => {
            this.peerId = id;
            console.log('My peer ID is: ' + id);
            if (this.onReady) this.onReady(id);
        });

        this.peer.on('connection', (conn) => {
            if (this.isHost) {
                this._handleIncomingConnection(conn);
            } else {
                // Unexpected incoming connection for client
                conn.close();
            }
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Notify UI
            if (this.onError) this.onError(err);
            else alert("Network Error: " + err.type);
        });
    }

    hostGame(id = null) {
        this.isHost = true;
        this.init(id);
    }

    joinGame(hostId) {
        this.isHost = false;
        this.init();
        // Wait for open before connecting
        this.onReady = () => {
            this.connectToHost(hostId);
        };
    }

    connectToHost(hostId) {
        console.log("Connecting to host:", hostId);
        // Force uppercase/trim just in case, though we did it in UI.
        // PeerJS IDs are case sensitive? Yes.

        this.conn = this.peer.connect(hostId, {
            reliable: true
        });

        this.conn.on('open', () => {
            console.log("Connected to Host! Sending Handshake...");
            // Send multiple times just to be safe in flaky networks? No, usually reliable.
            // But let's delay slightly to ensure channel is ready-ready
            setTimeout(() => {
                this.conn.send({ type: 'handshake', name: this.game.player.name, skin: this.game.player.skinURL });
            }, 500);

            if (this.onConnectionListUpdate) this.onConnectionListUpdate([{ name: "Connected! Waiting for lobby..." }]);
        });

        this.conn.on('data', (data) => {
            this._handleData(data, 'host');
        });

        this.conn.on('close', () => {
            alert("Disconnected from Host");
            location.reload();
        });

        this.conn.on('error', (err) => {
            console.error("Connection Error:", err);
            alert("Failed to connect to Host: " + err);
        });
    }

    _handleIncomingConnection(conn) {
        if (Object.keys(this.connections).length >= 9) {
            conn.close(); // Server full
            return;
        }

        console.log("Incoming connection from:", conn.peer);

        conn.on('open', () => {
            this.connections[conn.peer] = conn;
            // Send welcome packet?
        });

        conn.on('data', (data) => {
            this._handleData(data, conn.peer);
        });

        conn.on('close', () => {
            console.log("Connection closed:", conn.peer);
            delete this.connections[conn.peer];
            if (this.onPlayerDisconnect) this.onPlayerDisconnect(conn.peer);
        });
    }

    _handleData(data, senderId) {
        if (!data || !data.type) return;

        if (this.isHost) {
            // -- HOST LOGIC --

            // 1. Handshake
            if (data.type === 'handshake') {
                this.playersInfo[senderId] = { name: data.name, skin: data.skin };
                if (this.onPlayerJoin) this.onPlayerJoin(senderId, data);
                this._broadcastPlayerList();
            }

            // 2. Player Update (Position/Rot)
            if (data.type === 'update') {
                if (this.onPlayerUpdate) this.onPlayerUpdate(senderId, data);
            }

            // 3. Actions (Shoot)
            if (data.type === 'action') {
                if (this.onPlayerAction) this.onPlayerAction(senderId, data);
            }

        } else {
            // -- CLIENT LOGIC --

            // 1. World State Update
            if (data.type === 'worldState') {
                if (this.onWorldUpdate) this.onWorldUpdate(data.players);
            }

            // 2. Events (Shots fired by others, etc)
            if (data.type === 'event') {
                if (this.onEvent) this.onEvent(data);
            }

            // 3. Lobby List Update
            if (data.type === 'lobbyList') {
                if (this.onConnectionListUpdate) this.onConnectionListUpdate(data.list);
            }
        }
    }

    // --- Sending Methods ---

    // Client -> Host
    sendClientUpdate(data) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'update', ...data });
        }
    }

    sendClientAction(action, details) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'action', action, details });
        }
    }

    // Host -> Clients
    broadcastWorldState(playersData) {
        const payload = { type: 'worldState', players: playersData };
        this._broadcast(payload);
    }

    broadcastEvent(eventType, payload) {
        this._broadcast({ type: 'event', event: eventType, payload });
    }

    _broadcast(msg) {
        Object.values(this.connections).forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }

    _broadcastPlayerList() {
        // Collect names
        const list = [{ id: this.peerId, name: this.game.player.name || "Host" }]; // Add self
        Object.keys(this.connections).forEach(id => {
            if (this.playersInfo[id]) {
                list.push({ id: id, name: this.playersInfo[id].name });
            } else {
                list.push({ id: id, name: "Connecting..." });
            }
        });

        const payload = { type: 'lobbyList', list: list };
        this._broadcast(payload);

        // Also update local UI for Host
        if (this.onConnectionListUpdate) this.onConnectionListUpdate(list);
    }
}
