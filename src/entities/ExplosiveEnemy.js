import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class ExplosiveEnemy extends Enemy {
    constructor(scene, position) {
        super(scene, position);
        this.hp = 20; 
        this.speed = 6.0; // Fast
        this.damage = 80;
        this.scoreValue = 80;
        
        // Parts
        // Parts - initialized in _createMesh
        this.isExplosive = true;
        // this.spikes = null;
        // this.core = null;
    }

    _createMesh() {
        const group = new THREE.Group();
        const coreMat = new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.5, emissive: 0xff0000, emissiveIntensity: 0.5 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 });

        // Core Sphere
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), coreMat);
        core.position.y = 0.5;
        group.add(core);
        this.core = core;

        // Spike Cage (Rotates)
        const spikeGroup = new THREE.Group();
        spikeGroup.position.y = 0.5;
        
        const spikeGeo = new THREE.ConeGeometry(0.1, 0.4, 8);
        const positions = [
            [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]
        ];
        
        positions.forEach(dir => {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            const vec = new THREE.Vector3(...dir).normalize();
            spike.position.copy(vec.multiplyScalar(0.4));
            spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec);
            spikeGroup.add(spike);
        });
        
        // Ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 16), spikeMat);
        spikeGroup.add(ring);
        
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 16), spikeMat);
        ring2.rotation.x = Math.PI / 2;
        spikeGroup.add(ring2);

        group.add(spikeGroup);
        this.spikes = spikeGroup;

        return group;
    }

    update(dt, playerPosition) {
        super.update(dt, playerPosition);
        if (this.isDead) return;

        // Custom Animation: Roll/Rotate
        this.spikes.rotation.x += dt * 5;
        this.spikes.rotation.z += dt * 3;
        
        // Pulse Effect
        const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
        this.core.material.emissiveIntensity = 0.5 + pulse * 2.0;
        this.core.scale.setScalar(1.0 + pulse * 0.2);

        // Move
        const direction = new THREE.Vector3()
            .subVectors(playerPosition, this.mesh.position)
            .normalize();
        direction.y = 0;
        this.mesh.position.add(direction.multiplyScalar(this.speed * dt));
        this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

        this.updateGroundPosition();
    }
    die() {
         super.die();
         if (this.mesh && this.mesh.visible) {
             const event = new CustomEvent('enemy-death', { 
                 detail: { 
                     type: 'EXPLOSION', 
                     position: this.mesh.position.clone() 
                 } 
             });
             document.dispatchEvent(event);
         }

         this.mesh.visible = false;
         this.shouldRemove = true; // Remove next frame
    }
}
