import * as THREE from 'three';

export class RemotePlayer {
    constructor(scene, id, data) {
        this.scene = scene;
        this.id = id;
        this.mesh = null;
        this.name = data.name || "Unknown";
        this.color = 0xffffff;

        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Quaternion();

        this._init(data.skin);
    }

    _init(skinURL) {
        // Create Robot Group
        this.mesh = new THREE.Group();
        this.mesh.position.set(0, 5, 0);
        this.scene.add(this.mesh);

        // Materials
        const matMetalDark = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.8 });
        const matMetalLight = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.9 });
        const matJoint = new THREE.MeshStandardMaterial({ color: 0x111111 });

        // --- Body Construction ---
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), matMetalDark);
        torso.position.y = 1.1;
        this.mesh.add(torso);

        // Head (CRT Monitor Style)
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.6;
        this.mesh.add(headGroup);

        // 1. Monitor Housing (Beige/White Plastic)
        const housingMat = new THREE.MeshStandardMaterial({ color: 0xe0e0d0, roughness: 0.9 }); // Retro Beige
        const housingGeo = new THREE.BoxGeometry(0.5, 0.45, 0.45);
        const housing = new THREE.Mesh(housingGeo, housingMat);
        headGroup.add(housing);

        // 2. Screen (The Face)
        // Positioned slightly forward
        const screenGeo = new THREE.PlaneGeometry(0.35, 0.3);
        const screenMat = skinURL ? 
            new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(skinURL) }) : 
            new THREE.MeshBasicMaterial({ color: 0x333333 }); // Black screen if no skin

        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 0.02, 0.226); // Slightly protruding from housing front (0.225)
        headGroup.add(screen);

        const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.2);
        const leftLeg = new THREE.Mesh(legGeo, matMetalLight);
        leftLeg.position.set(-0.15, 0.35, 0);
        this.mesh.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, matMetalLight);
        rightLeg.position.set(0.15, 0.35, 0);
        this.mesh.add(rightLeg);

        // Arms (Shoulders)
        const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const leftShoulder = new THREE.Mesh(shoulderGeo, matMetalDark);
        leftShoulder.position.set(-0.35, 1.3, 0);
        this.mesh.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeo, matMetalDark);
        rightShoulder.position.set(0.35, 1.3, 0);
        this.mesh.add(rightShoulder);

        // Arm Segments
        const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
        const leftArm = new THREE.Mesh(armGeo, matMetalLight);
        leftArm.rotation.z = 0.2;
        leftArm.position.set(-0.45, 1.0, 0);
        this.mesh.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, matMetalLight);
        rightArm.rotation.z = -0.2;
        rightArm.position.set(0.45, 1.0, 0);
        this.mesh.add(rightArm);

        // Name Tag
        // (Optional: Implement 2D canvas sprite for name tag later)

        // Weapon Holder (Attach to Right Arm?)
        const weaponGeo = new THREE.BoxGeometry(0.1, 0.1, 0.6);
        const weaponMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        this.weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
        // Position relative to hand
        this.weaponMesh.position.set(0.45, 0.7, 0.3);
        this.mesh.add(this.weaponMesh);
    }

    update(dt) {
        if (!this.mesh) return;

        // Interpolate position and rotation
        this.mesh.position.lerp(this.targetPosition, 10 * dt);
        this.mesh.quaternion.slerp(this.targetRotation, 10 * dt);
    }

    updateState(data) {
        if (data.pos) {
            this.targetPosition.set(data.pos.x, data.pos.y, data.pos.z);
        }
        if (data.rot) {
            this.targetRotation.set(data.rot._x, data.rot._y, data.rot._z, data.rot._w);
        }
    }

    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Traverse to dispose all children
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.mesh = null;
        }
    }
}
