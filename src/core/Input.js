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
                // Ignore clicks on inputs/buttons
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
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
        } else {
            this.isLocked = false;
            // If we are not paused, show start screen (unless game over)
            // But wait, if we pause, we manually show start screen.
            // If user presses ESC, we just unlock.
            // Let's assume Game.js handles the UI for pause.
            // Here we just ensure state is correct.
        }
    }
}
