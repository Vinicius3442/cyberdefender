import * as THREE from 'three';
import { WeaponType } from '../core/WeaponSystem.js';

export class WeaponPickup {
    constructor(scene, position, type) {
        this.type = type || this.getRandomWeapon();
        this.scene = scene;
        this.shouldRemove = false;
        this.radius = 1.0;

        // Visual
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        this.mesh.position.y = 1.0; // Float

        // Box visual
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.5 })
        );
        this.mesh.add(box);

        // Text Label (Canvas) would be nice, but simple color/shape for now.
        // Or a floating light
        const light = new THREE.PointLight(0xffaa00, 1, 3);
        this.mesh.add(light);

        this.scene.add(this.mesh);
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
