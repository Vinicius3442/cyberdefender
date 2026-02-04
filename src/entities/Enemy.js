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

        // Create Mesh (Subclasses can override _createMesh to provide custom models)
        this.mesh = this._createMesh();
        this.mesh.position.copy(position);
        this.mesh.position.y = 0; // Origin is at feet now
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

        // Skip flashing if already flashing to avoid color glitching
        if (!this.isFlashing) {
            this.isFlashing = true;
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Check if material supports emissive (Standard/Phong)
                    if (child.material.emissive) {
                        if (!child.userData.hasClonedMaterial) {
                            child.material = child.material.clone();
                            child.userData.hasClonedMaterial = true;
                        }

                        if (!child.material.userData.originalEmissive) {
                            child.material.userData.originalEmissive = child.material.emissive.getHex();
                        }
                        child.material.emissive.setHex(0xffffff);
                    }
                }
            });

            setTimeout(() => {
                if (!this.isDead && this.mesh) {
                    this.mesh.traverse((child) => {
                        if (child.isMesh && child.material && child.material.userData.originalEmissive !== undefined) {
                            child.material.emissive.setHex(child.material.userData.originalEmissive);
                        }
                    });
                }
                this.isFlashing = false;
            }, 100);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        // Particle effect could go here
    }

    update(dt, playerPosition) {
        // Override in subclasses
    }
}
