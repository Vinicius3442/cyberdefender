import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class MeleeEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.speed = 4.0;
        this.hp = 50;
    }

    _createMesh() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222 }); // Aggressive Red

        // Small Body
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), mat);
        body.position.y = 0.5;
        group.add(body);

        // Fast Legs
        const legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const lLeg = new THREE.Mesh(legGeo, mat); lLeg.position.set(-0.15, 0.2, 0); group.add(lLeg);
        const rLeg = new THREE.Mesh(legGeo, mat); rLeg.position.set(0.15, 0.2, 0); group.add(rLeg);

        // Head
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), mat);
        head.position.y = 0.9;
        group.add(head);

        // Sword Arm
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
        sword.position.set(0.3, 0.6, 0.3);
        sword.rotation.x = Math.PI / 4;
        group.add(sword);

        group.scale.set(1.5, 1.5, 1.5); // Make bigger
        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        // Simple seek behavior
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();

        // Ignore Y difference for movement (stay on ground)
        direction.y = 0;
        direction.normalize();

        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    }
}
