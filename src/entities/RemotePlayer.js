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
        // Create Mesh
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        let material;

        if (skinURL) {
            const loader = new THREE.TextureLoader();
            const texture = loader.load(skinURL);
            material = new THREE.MeshStandardMaterial({ map: texture });
        } else {
            material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 5, 0); // Spawn high
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Name Tag
        // (Optional: Implement 2D canvas sprite for name tag later)

        // Weapon Holder
        const weaponGeo = new THREE.BoxGeometry(0.1, 0.1, 0.6);
        const weaponMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        this.weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
        this.weaponMesh.position.set(0.3, 0.2, 0.3);
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
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
