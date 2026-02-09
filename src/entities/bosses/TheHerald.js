import * as THREE from 'three';
import { Enemy } from '../Enemy.js';
import { CitadelEye } from '../CitadelEye.js';
import { ArcherEnemy } from '../ArcherEnemy.js';

export class TheHerald extends Enemy {
    constructor(scene, position, player, game) {
        super(scene, position);
        this.player = player;
        this.game = game; // access to spawn enemies

        this.hp = 5000;
        this.maxHp = 5000;
        this.isBoss = true;
        this.name = "THE HERALD";

        this.state = 'IDLE'; // IDLE, LASER, SHOCKWAVE, SUMMON
        this.stateTimer = 0;

        // Herald is a giant tower structure, stationary but with moving parts
        this.speed = 0;
    }

    _createMesh() {
        const group = new THREE.Group();

        // 1. Base Tower (Obsidian)
        const towerGeo = new THREE.CylinderGeometry(4, 6, 20, 8);
        const towerMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.2,
            metalness: 0.8
        });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 10;
        group.add(tower);

        // 2. The Eye Housing (Top)
        const headGeo = new THREE.BoxGeometry(8, 6, 8);
        const head = new THREE.Mesh(headGeo, towerMat);
        head.position.y = 22;
        group.add(head);

        // 3. Neon Lines (Tron Style)
        const lineGeo = new THREE.BoxGeometry(8.2, 0.2, 8.2);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for corruption
        const line1 = new THREE.Mesh(lineGeo, lineMat);
        line1.position.y = 24;
        group.add(line1);

        // 4. The Actual Eye Logic is internal or linked?
        // We can reuse CitadelEye visual or build a new one here.
        // Let's build a dedicated "Boss Eye" mesh here.
        const eyeGeo = new THREE.SphereGeometry(2, 32, 32);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyeMesh.position.set(0, 22, 3.5); // Front face
        group.add(this.eyeMesh);

        // Iris
        const irisGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const irisMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.iris = new THREE.Mesh(irisGeo, irisMat);
        this.iris.position.z = 1.8; // Protrude slightly
        this.eyeMesh.add(this.iris);

        return group;
    }

    update(dt, playerPos) {
        if (this.isDead) return;

        // Boss Logic State Machine
        this.stateTimer -= dt;

        // Always track player with Eye
        this.eyeMesh.lookAt(playerPos);

        if (this.stateTimer <= 0) {
            this.pickNextState();
        }

        // Execute State Actions
        switch (this.state) {
            case 'LASER':
                this.updateLaser(dt, playerPos);
                break;
            case 'SHOCKWAVE':
                // Handled in trigger
                break;
            case 'SUMMON':
                // Handled in trigger
                break;
        }

        // UI Boss Bar Update (if Game.js handles it via HP property, good. Otherwise need event)
        // Game.js usually reads boss.hp
    }

    pickNextState() {
        const rand = Math.random();
        if (rand < 0.4) {
            this.triggerLaser();
        } else if (rand < 0.7) {
            this.triggerShockwave();
        } else {
            this.triggerSummon();
        }
    }

    triggerLaser() {
        this.state = 'LASER';
        this.stateTimer = 5.0; // 5 seconds of laser
        console.log("BOSS: LASER!");
        // Create Laser Mesh if not exists
        if (!this.laserBeam) {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
            geo.rotateX(-Math.PI / 2);
            geo.translate(0, 0, 0.5);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
            this.laserBeam = new THREE.Mesh(geo, mat);
            this.eyeMesh.add(this.laserBeam);
        }
        this.laserBeam.visible = true;
    }

    updateLaser(dt, playerPos) {
        // Laser tracking
        const dist = this.eyeMesh.getWorldPosition(new THREE.Vector3()).distanceTo(playerPos);
        this.laserBeam.scale.set(1, 1, dist);

        // Damage Tick
        if (Math.random() < 0.1) { // 10% chance per frame (approx 6 ticks/sec)
            // Raycast check or simple distance check?
            // Simple angular check
            const toPlayer = new THREE.Vector3().subVectors(playerPos, this.eyeMesh.getWorldPosition(new THREE.Vector3())).normalize();
            const look = new THREE.Vector3(0, 0, 1).applyQuaternion(this.eyeMesh.getWorldQuaternion(new THREE.Quaternion()));
            if (look.dot(toPlayer) > 0.98) {
                this.player.takeDamage(1, "THE HERALD LASER");
            }
        }
    }

    triggerShockwave() {
        this.state = 'SHOCKWAVE';
        this.stateTimer = 3.0; // Cooldown
        console.log("BOSS: SHOCKWAVE!");

        if (this.laserBeam) this.laserBeam.visible = false;

        // Visual Ring
        // Logic: Inverse controls for 5 seconds?
        if (this.player) {
            // Check distance (global shockwave or limited?)
            // "Invert Input" effect
            this.player.addStatusEffect('HACKED', 5.0);
            // Player.js needs to handle 'HACKED' status in input reading
        }
    }

    triggerSummon() {
        this.state = 'SUMMON';
        this.stateTimer = 4.0;
        console.log("BOSS: SUMMON!");

        if (this.laserBeam) this.laserBeam.visible = false;

        // Spawn 2 Archers on flanks
        // Assuming EntityManager is available via this.game
        if (this.game && this.game.entityManager) {
            const posLeft = this.mesh.position.clone().add(new THREE.Vector3(-20, 0, 20));
            const posRight = this.mesh.position.clone().add(new THREE.Vector3(20, 0, 20));

            this.game.entityManager.spawnEnemy('ARCHER', posLeft);
            this.game.entityManager.spawnEnemy('ARCHER', posRight);
        }
    }

    die() {
        super.die();
        // Trigger CSS Cutscene
        this.triggerVictoryScene();
    }

    triggerVictoryScene() {
        // Create CSS Overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'black';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 2s';

        overlay.innerHTML = `
            <h1 style="color: #00ffff; font-family: 'Courier New'; text-shadow: 0 0 20px #00ffff; font-size: 4rem;">SYSTEM PURGED</h1>
            <div style="color: white; margin-top: 20px;">The Herald has fallen. The Gate opens.</div>
        `;

        document.body.appendChild(overlay);

        // Fade in
        setTimeout(() => overlay.style.opacity = '1', 100);

        // Return to Menu after 5s
        setTimeout(() => {
            document.body.removeChild(overlay);
            // End Game Logic?
        }, 8000);
    }
}
