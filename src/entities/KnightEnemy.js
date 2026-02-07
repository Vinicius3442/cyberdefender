import * as THREE from 'three';
import { Enemy } from './Enemy.js';

export class KnightEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        
        this.hp = 120; 
        this.speed = 6.0; 
        this.damage = 25; 
        this.scoreValue = 100;
        this.attackRange = 3.0; 
    }

    takeDamage(amount) {
        // Armor blocks light shots
        if (amount < 15) {
            // Deflect sound/spark?
            return; 
        }
        super.takeDamage(amount);
    }

    _createMesh() {
        const group = new THREE.Group();

        // Materials
        const armorMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
        const jointMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), armorMat);
        torso.position.y = 1.1;
        group.add(torso);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.25, 0.9, 0.3);
        const lLeg = new THREE.Mesh(legGeo, armorMat);
        lLeg.position.set(-0.2, 0.45, 0);
        group.add(lLeg);
        
        const rLeg = new THREE.Mesh(legGeo, armorMat);
        rLeg.position.set(0.2, 0.45, 0);
        group.add(rLeg);

        // Pauldrons (Shoulders)
        const pauldronGeo = new THREE.BoxGeometry(0.3, 0.3, 0.4);
        const lPaul = new THREE.Mesh(pauldronGeo, armorMat);
        lPaul.position.set(-0.45, 1.4, 0);
        group.add(lPaul);

        const rPaul = new THREE.Mesh(pauldronGeo, armorMat);
        rPaul.position.set(0.45, 1.4, 0);
        group.add(rPaul);

        // Head (Bucket Helm)
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8), armorMat);
        head.position.y = 1.75;
        group.add(head);

        // Eye Slit
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        slit.position.set(0, 1.75, 0.15);
        group.add(slit);

        // Sword Arm
        const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const rArm = new THREE.Mesh(armGeo, armorMat);
        rArm.position.set(0.5, 1.0, 0);
        group.add(rArm);

        // Energy Sword (Greatsword)
        const swordBladeGeo = new THREE.BoxGeometry(0.1, 2.0, 0.3); // Wide blade
        const swordMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00ffff, 
            emissiveIntensity: 2.0 
        });
        this.sword = new THREE.Mesh(swordBladeGeo, swordMat);
        this.sword.position.set(0.5, 1.5, 0.5); // Hand position
        this.sword.rotation.x = Math.PI/4;
        group.add(this.sword);
        
        // Hilt
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), jointMat);
        hilt.rotation.z = Math.PI/2;
        hilt.position.y = -1.0; // Relative to blade center
        this.sword.add(hilt);
        
        return group;
    }

    update(dt, playerPos) {
        super.update(dt, playerPos);
        this.updateGroundPosition();
        
        // Spin sword if close
        const dist = this.mesh.position.distanceTo(playerPos);
        if (dist < 5) {
            this.sword.rotation.z += 10 * dt; // Attack anim
        }
    }
}
