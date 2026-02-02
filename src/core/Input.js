export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            jump: false,
            attack: false,
            interact: false
        };
        this.isLocked = false;
        this.onAttack = null;
        this.onSwitchWeapon = null;
        this.onReload = null;
        this.onPause = null;
        this.onPause = null;
        this.onZoom = null;
        this.onInteract = null;

        this._init();
    }

    _init() {
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
        document.addEventListener('keyup', (e) => this._onKeyUp(e));
        document.addEventListener('mousedown', (e) => this._onMouseDown(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('pointerlockchange', () => this._onPointerLockChange());

        // Start screen click to lock
        const startScreen = document.getElementById('start-screen');
        if (startScreen) {
            startScreen.addEventListener('click', (e) => {
                // Ignore clicks if we are in Lobby mode (checking if lobby-screen is visible)
                const lobbyScreen = document.getElementById('lobby-screen');
                if (lobbyScreen && lobbyScreen.style.display !== 'none') return;

                // Ignore clicks on inputs/buttons
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('.interactive')) return;

                // Only lock if we are actually playing or about to play?
                // For now, just restricting it from lobby is enough.
                document.body.requestPointerLock();
            });
        }
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': this.keys.forward = true; break;
            case 'KeyS': this.keys.backward = true; break;
            case 'KeyA': this.keys.left = true; break;
            case 'KeyD': this.keys.right = true; break;
            case 'Space': this.keys.jump = true; break;
            case 'KeyE':
                this.keys.interact = true;
                if (this.onInteract) this.onInteract();
                break;
            case 'KeyR': if (this.onReload) this.onReload(); break;
            case 'KeyP': if (this.onPause) this.onPause(); break;
            case 'Digit1': if (this.onSwitchWeapon) this.onSwitchWeapon(0); break;
            case 'Digit2': if (this.onSwitchWeapon) this.onSwitchWeapon(1); break;
            case 'Digit3': if (this.onSwitchWeapon) this.onSwitchWeapon(2); break;
            case 'Digit4': if (this.onSwitchWeapon) this.onSwitchWeapon(3); break;
            case 'Digit5': if (this.onSwitchWeapon) this.onSwitchWeapon(4); break;
            case 'Digit6': if (this.onSwitchWeapon) this.onSwitchWeapon(5); break;
            case 'Digit7': if (this.onSwitchWeapon) this.onSwitchWeapon(6); break;
            case 'Digit8': if (this.onSwitchWeapon) this.onSwitchWeapon(7); break;
            case 'Digit9': if (this.onSwitchWeapon) this.onSwitchWeapon(8); break;
            case 'Digit0': if (this.onSwitchWeapon) this.onSwitchWeapon(9); break;
            case 'Minus': if (this.onSwitchWeapon) this.onSwitchWeapon(10); break;
            case 'Equal': if (this.onSwitchWeapon) this.onSwitchWeapon(11); break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': this.keys.forward = false; break;
            case 'KeyS': this.keys.backward = false; break;
            case 'KeyA': this.keys.left = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'KeyD': this.keys.right = false; break;
            case 'Space': this.keys.jump = false; break;
            case 'KeyE': this.keys.interact = false; break;
        }
    }

    _onMouseDown(e) {
        if (this.isLocked) {
            if (e.button === 0) { // Left Click
                this.keys.attack = true;
                if (this.onAttack) this.onAttack(); // Keep for single click actions if needed
            } else if (e.button === 2) { // Right Click
                if (this.onZoom) this.onZoom(true);
            }
        }
    }

    _onMouseUp(e) {
        if (this.isLocked) {
            if (e.button === 0) {
                this.keys.attack = false;
            } else if (e.button === 2) { // Right Click Release
                if (this.onZoom) this.onZoom(false);
            }
        }
    }

    _onMouseMove(e) {
        if (this.isLocked) {
            this.mouseX = e.movementX || 0;
            this.mouseY = e.movementY || 0;
            if (this.onMouseMove) this.onMouseMove(this.mouseX, this.mouseY);
        }
    }

    _onPointerLockChange() {
        if (document.pointerLockElement === document.body) {
            this.isLocked = true;
            const startScreen = document.getElementById('start-screen');
            if (startScreen) startScreen.style.display = 'none';
            // Also hide pause menu if it was open? 
            // Better handled by game logic, but we can ensure it.
            const pauseMenu = document.getElementById('pause-menu');
            // If we locked, we are playing.
            // Note: Game.js togglePause handles state.
        } else {
            this.isLocked = false;
            // If we unlocked, and we are NOT in the start screen, we should pause.
            const startScreen = document.getElementById('start-screen');
            const isMenuOpen = startScreen && startScreen.style.display !== 'none';
            const gameOverScreen = document.getElementById('game-over-screen');
            const isGameOver = gameOverScreen && gameOverScreen.style.display !== 'none';

            if (!isMenuOpen && !isGameOver) {
                // We were playing, and got unlocked (user pressed ESC).
                // Trigger Pause.
                if (this.onPause) {
                    // Check if already paused handled by Game logic?
                    // Game.togglePause checks isPaused flag.
                    // If we just unlocked, we want to SET pause to true.
                    // We call onPause() which calls togglePause().
                    // But wait, togglePause calls exitPointerLock. Loop?
                    // Game.togglePause checks: if paused -> exitPointerLock.
                    // Here: pointerUnlock -> onPause -> togglePause -> paused=true. 
                    // Should be fine.

                    // Small delay to ensure we don't conflict with click-to-lock logic?
                    // No.

                    // BUT: We need to know if the Game considers itself paused.
                    // Input doesn't know game state.
                    // We just fire the event. Game.js should handle "If already paused, do nothing" or "If unlocked, force pause".
                    // Game.togglePause toggles. If we press ESC, we unlock.
                    // If we call togglePause(), isPaused becomes true. UI shows. Perfect.
                    this.onPause();
                }
            }
        }
    }
}
