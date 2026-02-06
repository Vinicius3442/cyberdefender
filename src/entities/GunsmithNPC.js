import * as THREE from 'three';

export class GunsmithNPC {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position;
        this.mesh = this._createMesh();
        this.scene.add(this.mesh);
        
        // Floating Text
        this.textMesh = this._createText();
        this.scene.add(this.textMesh);
        
        this.time = 0;
    }

    _createMesh() {
        const group = new THREE.Group();
        group.position.copy(this.position);

        // Round Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 })
        );
        head.position.y = 1.6;
        group.add(head);
        
        // Eyes (Goggles)
        const goggle = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.15, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        goggle.position.set(0, 1.6, 0.3);
        group.add(goggle);

        // Body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12),
            new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        body.position.y = 1.0;
        group.add(body);

        // Apron
        const apron = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.7, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Leather
        );
        apron.position.set(0, 0.9, 0.32);
        group.add(apron);

        return group;
    }

    _createText() {
        // Simple HTML overlay tracked to position might be better, 
        // but sticking to simple logic for now. 
        // Since we don't have a FontLoader ready-to-go in this specific snippet context safely,
        // we'll rely on Player interaction text or look-at logic.
        // For now, return a dummy object or simple marker.
        return new THREE.Object3D(); 
    }

    update(dt, playerPos) {
        this.time += dt;
        // Idle Animation: Bobbing head
        if (this.mesh) {
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        }
    }
}
