import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class TankEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        // this.mesh.scale.set(2, 2, 2); // Removed scale, building big instead
        // this.mesh.position.y = 2; // Handled by mesh logic
        this.hp = 200;
        this.speed = 1.5; // Slow
        this.damage = 30;
    }

    _createMesh() {
        const group = new THREE.Group();
        const darkMetal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6 });

        // Heavy Legs
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.6), darkMetal);
        lLeg.position.set(-0.4, 0.5, 0);
        group.add(lLeg);
        
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.6), darkMetal);
        rLeg.position.set(0.4, 0.5, 0);
        group.add(rLeg);

        // Huge Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.0), armorMat);
        body.position.y = 1.6;
        group.add(body);

        // Head (Small dome)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), darkMetal);
        head.position.y = 2.2;
        group.add(head);

        // Cyclops Eye
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        eye.rotation.x = Math.PI/2;
        eye.position.set(0, 2.2, 0.35);
        group.add(eye);

        return group;
    }

    update(dt, playerPosition) {
        if (this.isDead) return;

        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        direction.y = 0;

        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
    }
}
