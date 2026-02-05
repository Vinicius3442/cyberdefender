import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class TankEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.hp = 200;
        this.speed = 1.2; // Very Slow
        this.damage = 30;
        this.scoreValue = 300;
        
        // Parts
        // Parts - initialized in _createMesh
        // this.shieldArm = null;
        // this.legs = [];
    }

    _createMesh() {
        const group = new THREE.Group();
        const metalDark = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const armorPlate = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.5 });
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8 });
        
        // Torso - Bulkier
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.8), armorPlate);
        torso.position.y = 1.8;
        group.add(torso);
        this.torsoMesh = torso;

        // Head - Dome
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), metalDark);
        head.position.y = 2.3;
        group.add(head);
        
        // Eye (Cyclops Slot)
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        eye.position.set(0, 2.3, 0.3);
        group.add(eye);

        // Legs - Heavy Pistons
        this.legs = [];
        const legPositions = [-0.5, 0.5];
        legPositions.forEach(x => {
            const legGroup = new THREE.Group();
            legGroup.position.set(x, 1.3, 0); // Hip joint
            
            // Upper
            const upper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), metalDark);
            upper.position.y = -0.4;
            legGroup.add(upper);
            
            // Lower (Tread/Foot)
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.8), armorPlate);
            foot.position.y = -1.0;
            legGroup.add(foot);
            
            group.add(legGroup);
            this.legs.push(legGroup);
        });

        // Shield Arm (Left)
        const shieldGroup = new THREE.Group();
        shieldGroup.position.set(-0.9, 1.8, 0);
        
        const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1.0), shieldMat);
        shield.position.set(0, -0.3, 0.4);
        shield.rotation.y = -Math.PI / 6; // Angled forward
        shieldGroup.add(shield);
        
        group.add(shieldGroup);
        this.shieldArm = shieldGroup;

        // Weapon Arm (Right) - Heavy Cannon
        const gunGroup = new THREE.Group();
        gunGroup.position.set(0.9, 1.8, 0);
        
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2), metalDark);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.z = 0.5;
        gunGroup.add(cannon);
        
        group.add(gunGroup);
        this.gunArm = gunGroup;

        return group;
    }

    update(dt, playerPosition) {
        super.update(dt, playerPosition);
        if (this.isDead && !this.playingDeathAnim) return;
        if (this.isDead && this.playingDeathAnim) return;

        const dist = this.mesh.position.distanceTo(playerPosition);
        const attackRange = 3.0;

        // Move
        if (dist > attackRange) {
             const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.mesh.position)
                .normalize();
             direction.y = 0;
             this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
             this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
             
             // Walk Anim
             this.animWalk(dt * 5);
        } else {
             this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
             if (this.currentAnim !== 'attack') {
                 this.playAnimation('attack');
             }
        }
        
        this.updateGroundPosition();
    }

    animWalk(t) {
        // Heavy stomp
        const time = Date.now() * 0.003;
        this.legs[0].position.y = 1.3 + Math.sin(time) * 0.2;
        this.legs[1].position.y = 1.3 + Math.sin(time + Math.PI) * 0.2;
        
        // Body sway
        this.torsoMesh.rotation.z = Math.sin(time) * 0.05;
    }

    animAttack(t) {
        // Shield Bash
        if (t < 0.5) {
            // Wind up
            this.shieldArm.rotation.y = THREE.MathUtils.lerp(this.shieldArm.rotation.y, Math.PI / 2, 0.1);
            this.shieldArm.position.z = -0.5;
        } else if (t < 0.8) {
            // Smash
            this.shieldArm.rotation.y = -Math.PI / 6;
            this.shieldArm.position.z = 1.0;
        } else {
            // Recover
             this.shieldArm.position.z = 0;
             if (t > 1.5) this.currentAnim = null;
        }
    }

    animDie(t) {
        // Explode into pieces
        if (t < 1.0) {
            this.torsoMesh.position.y += 0.1;
            this.torsoMesh.rotation.x -= 0.05;
            
            this.shieldArm.position.x -= 0.1;
            this.shieldArm.rotation.z += 0.1;
            
            this.gunArm.position.x += 0.1;
            this.gunArm.rotation.z -= 0.1;

            // Flash red/orange?
            if (this.torsoMesh.material.emissive)
                this.torsoMesh.material.emissive.setHex(Math.random() > 0.5 ? 0xffaa00 : 0x000000);
        } else {
             this.mesh.visible = false; // Poof
        }
    }
}
