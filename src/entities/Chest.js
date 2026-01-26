import * as THREE from 'three';

export class Chest {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.isOpened = false;
        this.shouldRemove = false;

        // Create Mesh
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // Materials
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });

        // Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.6), woodMat);
        base.position.y = 0.3;
        this.mesh.add(base);

        // Lid (Pivot group)
        this.lid = new THREE.Group();
        this.lid.position.set(0, 0.6, -0.3); // Hinge at back

        const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.6), woodMat);
        lidMesh.position.set(0, 0.1, 0.3); // Offset so pivot works
        this.lid.add(lidMesh);

        // Gold Trims
        const trim1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.62), goldMat);
        trim1.position.set(-0.4, 0.3, 0);
        this.mesh.add(trim1);

        const trim2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.62), goldMat);
        trim2.position.set(0.4, 0.3, 0);
        this.mesh.add(trim2);

        this.mesh.add(this.lid);
        this.scene.add(this.mesh);

        // Animation state
        this.animationTime = 0;
    }

    open() {
        if (this.isOpened) return;
        this.isOpened = true;
    }

    update(dt) {
        if (this.isOpened && this.lid.rotation.x > -Math.PI / 2) {
            this.lid.rotation.x -= 2.0 * dt;
        }
    }
}
