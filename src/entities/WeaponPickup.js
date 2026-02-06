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
            // Case-Insensitive Validation
            if (type === 'AMMO' || type === 'HEALTH') {
                this.type = type;
            } else {
                const entries = Object.entries(WeaponType);
                const match = entries.find(([key, val]) => val.toUpperCase() === type.toUpperCase() || key.toUpperCase() === type.toUpperCase());
                
                if (match) {
                    this.type = match[1]; // Use value (e.g. 'Pistol')
                } else {
                    console.warn(`Invalid pickup type: '${type}', defaulting to AMMO.`);
                    this.type = 'AMMO';
                }
            }
        }

        this.mesh = this._createMesh();
        this.mesh = this._createMesh();
        this.mesh.position.copy(this.position);
        
        // Snap to ground initially
        if (this.scene.userData.getTerrainHeight) {
            const h = this.scene.userData.getTerrainHeight(this.position.x, this.position.z);
            this.mesh.position.y = h + 1.0; // Initial float
        }
        
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
        
        let groundH = 0;
        if (this.scene.userData.getTerrainHeight) {
            groundH = this.scene.userData.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        }
        
        this.mesh.position.y = groundH + 1.0 + Math.sin(Date.now() * 0.003) * 0.2;

        if (this.mesh.position.distanceTo(playerPos) < this.radius) {
            return true; // Picked up
        }
        return false;
    }
}
