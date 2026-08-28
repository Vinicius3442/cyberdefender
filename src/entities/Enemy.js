import * as THREE from 'three';

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.isDead = false;

        // Stats
        this.hp = 30;
        this.speed = 3;
        this.damage = 10;
        this.scoreValue = 100;

        // Bounding Box / Hitbox for fast & reliable collision
        this.hitboxSize = new THREE.Vector3(1.2, 1.8, 1.2);
        this.hitboxOffset = new THREE.Vector3(0, 0.9, 0);

        // Create Mesh
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;

        this.scene.add(this.mesh);
    }

    _createMesh() {
        return this._createHumanoidMesh(); // Default fallback
    }

    _createHumanoidMesh() {
        const group = new THREE.Group();

        // Materials
        this.skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Skin tone
        this.shirtMat = new THREE.MeshStandardMaterial({ color: 0x882222 }); // Red Shirt
        this.pantsMat = new THREE.MeshStandardMaterial({ color: 0x223344 }); // Blue Pants
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Legs (H=0.55) -> Center Y = 0.275
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), this.pantsMat);
        leftLeg.position.set(-0.1, 0.275, 0);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), this.pantsMat);
        rightLeg.position.set(0.1, 0.275, 0);
        group.add(rightLeg);

        // Body (H=0.5) -> Starts at 0.55. Center Y = 0.55 + 0.25 = 0.8
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), this.shirtMat);
        torso.position.y = 0.8;
        group.add(torso);

        // Arms (H=0.45) -> Shoulder at ~1.0. Center Y = 0.8? Adjust visual.
        // Let's create arms hanging from 1.0 down. Center = 1.0 - 0.225 = 0.775
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), this.skinMat);
        leftArm.position.set(-0.25, 0.775, 0);
        group.add(leftArm);

        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), this.skinMat);
        rightArm.position.set(0.25, 0.775, 0);
        group.add(rightArm);

        // Head (H=0.25) -> Starts at 0.55 + 0.5 = 1.05. Center = 1.05 + 0.125 = 1.175
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), this.skinMat);
        head.position.y = 1.175;
        group.add(head);

        // Eyes (Relative to head center 1.175)
        // Z = 0 + 0.125 (half head) + 0.005. Y = 1.175 + 0.03
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), eyeMat);
        leftEye.position.set(-0.06, 1.205, 0.13);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), eyeMat);
        rightEye.position.set(0.06, 1.205, 0.13);
        group.add(rightEye);

        return group;
    }

    setSkinColor(color) {
        if (this.shirtMat) this.shirtMat.color.setHex(color);
        if (this.pantsMat) this.pantsMat.color.setHex(color);
    }

    takeDamage(amount) {
        this.hp -= amount;

        // Flash effect without runtime material cloning (prevents WebGL shader re-compilation lag)
        if (!this.isFlashing && this.mesh) {
            this.playAnimation('hit');

            this.isFlashing = true;
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.material.emissive) {
                        if (child.material.userData.originalEmissive === undefined) {
                            child.material.userData.originalEmissive = child.material.emissive.getHex();
                            child.material.userData.originalIntensity = child.material.emissiveIntensity;
                        }
                        child.material.emissive.setHex(0xff3333);
                        child.material.emissiveIntensity = 1.0;
                    } else if (child.material.color) {
                        if (child.material.userData.originalColor === undefined) {
                            child.material.userData.originalColor = child.material.color.getHex();
                        }
                        child.material.color.setHex(0xff6666);
                    }
                }
            });

            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (child.material.emissive && child.material.userData.originalEmissive !== undefined) {
                                child.material.emissive.setHex(child.material.userData.originalEmissive);
                                child.material.emissiveIntensity = child.material.userData.originalIntensity || 0;
                            } else if (child.material.color && child.material.userData.originalColor !== undefined) {
                                child.material.color.setHex(child.material.userData.originalColor);
                            }
                        }
                    });
                }
                this.isFlashing = false;
            }, 80);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.scoreValue = this.scoreValue || 100;

        // Loot
        this.dropLoot();

        // Dispatch Death Event for visual effects
        const event = new CustomEvent('enemy-death', {
            detail: {
                type: this.isExplosive ? 'EXPLOSION' : 'NORMAL',
                position: this.mesh ? this.mesh.position.clone() : new THREE.Vector3()
            }
        });
        document.dispatchEvent(event);

        // Anim
        this.playAnimation('die');
        this.playingDeathAnim = true;

        // Spawn light death particles immediately (optimized for high FPS)
        if (this.scene && this.scene.userData && this.scene.userData.particleSystem && this.mesh) {
            this.scene.userData.particleSystem.createExplosion(
                this.mesh.position, 
                this.isBoss ? 0xffaa00 : 0xaa2222, 
                this.isBoss ? 15 : 4, 
                this.isBoss ? 1.5 : 0.6
            );
        }

        // Flag for removal after death animation completes
        setTimeout(() => {
            this.shouldRemove = true;
        }, 400);
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
            });
            this.mesh = null;
        }
    }

    dropLoot() {
        // Drop Chance
        let chance = 0.3; // 30% default
        if (this.isBoss) chance = 1.0; // Boss always drops

        if (Math.random() < chance) {
            let dropType = 'AMMO';

            // Bosses drop Weapons or Health
            if (this.isBoss) {
                const rand = Math.random();
                if (rand < 0.4) dropType = 'HEALTH';
                else if (rand < 0.7) dropType = 'AMMO'; // Big ammo?
                else dropType = 'RANDOM_WEAPON';
            }

            // Specific overrides?
            // e.g. Sniper drops Sniper Ammo? (Future)

            // Emit Drop Event (Game.js listens)
            // If RANDOM_WEAPON, we let WeaponPickup handle randomization, or pass specific?
            // WeaponPickup handles 'RANDOM' if type is null.

            const dropPos = this.mesh.position.clone();
            dropPos.y += 1.0;

            // Cheat: accessing Game via global or event?
            // Game.js has document listener 'player-drop-item' -> calls spawnPickup
            // Let's reuse that or make a new one 'spawn-pickup'
            // Game.js line 122: document.addEventListener('player-drop-item'...
            // Let's reuse that for now, or add new one. 
            // Better: 'spawn-pickup'

            // Wait, Game.js listens to 'player-drop-item'. 
            // Let's dispatch 'spawn-pickup' and add listener in Game.js?
            // Or just use 'player-drop-item' (misnamed but functional).
            // Let's add listener to Game.js for 'spawn-pickup' for clarity.
            const event = new CustomEvent('spawn-pickup', {
                detail: {
                    type: dropType === 'RANDOM_WEAPON' ? null : dropType,
                    position: dropPos
                }
            });
            document.dispatchEvent(event);
        }
    }


    update(dt, playerPosition) {
        this.updateAnimations(dt);
        if (this.isDead && !this.playingDeathAnim) { // If dead but no death anim defined/playing
            // Stop logical updates
            return;
        }
        if (this.playingDeathAnim && this.isDead) return; // Allow death anim to play but stop movement
        // ... (subclasses handle transform updates)
    }

    // Animation System
    updateAnimations(dt) {
        // Simple tween-like system
        if (this.currentAnim) {
            this.animTimer += dt;
            // Logic per anim? Or generic keyframes?
            // Ideally we just modify transforms here
            if (this.currentAnim === 'attack') this.animAttack(this.animTimer);
            if (this.currentAnim === 'die') this.animDie(this.animTimer);
        }
    }

    playAnimation(name) {
        this.currentAnim = name;
        this.animTimer = 0;
        if (name === 'attack') {
            this.hasDealtAttackDamage = false; // Reset damage flag for Collision.js
        }
    }

    // Default implementations (can override)
    animAttack(t) { }
    animDie(t) { }

    // Helper for subclasses
    updateGroundPosition() {
        if (this.scene.userData.getTerrainHeight) {
            const h = this.scene.userData.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
            this.mesh.position.y = h;
        }
    }
}
