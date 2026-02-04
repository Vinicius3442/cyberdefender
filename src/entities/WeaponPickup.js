import * as THREE from 'three';
import { WeaponType } from '../core/WeaponSystem.js';
import { WeaponFactory } from '../core/WeaponFactory.js';

export class WeaponPickup {
    constructor(scene, position, type = 'RANDOM') {
        this.scene = scene;
        this.position = position.clone();
        this.shouldRemove = false; // Keep existing property

        // Decide type if RANDOM
        if (type === 'RANDOM' || !type) {
             const rand = Math.random();
             if (rand < 0.7) {
                 this.type = 'AMMO'; // 70% chance ammo
             } else {
                 // 30% Weapon
                 const keys = Object.values(WeaponType);
                 this.type = keys[Math.floor(Math.random() * keys.length)];
             }
        } else {
            this.type = type;
        }

        this.mesh = this._createMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        this.yOffset = 0; // New property for bobbing
        this.radius = 2.0; // Fix: Define pickup radius
    }

    _createMesh() {
        let mesh;

        if (this.type === 'AMMO') {
            mesh = WeaponFactory.createAmmoMesh();
        } else {
            // Weapon Model
            mesh = WeaponFactory.createWeaponMesh(this.type);
            // Center it inside group? It's already group.
        }

        // Add bobbing light
        const light = new THREE.PointLight(this.type === 'AMMO' ? 0x00ff00 : 0xffff00, 1, 3);
        light.position.y = 0.5;
        mesh.add(light);
        
        return mesh;
    }

    getRandomWeapon() {
        const types = Object.values(WeaponType);
        // Filter out basic weapons?
        const basics = [WeaponType.PISTOL, WeaponType.SWORD];
        const pool = types.filter(t => !basics.includes(t));
        return pool[Math.floor(Math.random() * pool.length)];
    }

    update(dt, playerPos) {
        this.mesh.rotation.y += dt * 2;
        this.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.2;

        if (this.mesh.position.distanceTo(playerPos) < this.radius) {
            return true; // Picked up
        }
        return false;
    }
}
