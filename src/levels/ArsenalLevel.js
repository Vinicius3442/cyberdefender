import * as THREE from 'three';
import { WeaponConfig, WeaponType } from '../core/WeaponSystem.js';
import { GunsmithNPC } from '../entities/GunsmithNPC.js';

export class ArsenalLevel {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.walls = [];
        this.weaponNodes = [];
    }

    build() {
        // ... floor/walls ...
        // Clear existing world (simple approach)
        // Ideally we'd have a WorldManager, but for now we just add meshes.
        
        // Floor
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        this.createWall(0, 5, -10, 20, 10, wallMat); // Back
        this.createWall(0, 5, 10, 20, 10, wallMat);  // Front
        this.createWall(-10, 5, 0, 20, 10, wallMat, true); // Left
        this.createWall(10, 5, 0, 20, 10, wallMat, true);  // Right
        
        // Light
        const light = new THREE.PointLight(0xffaa00, 1, 30);
        light.position.set(0, 8, 0);
        this.scene.add(light);

        // Weapon Racks
        this.createWeaponRack(-8, 2, -9, [WeaponType.RIFLE, WeaponType.SHOTGUN, WeaponType.SNIPER]);
        this.createWeaponRack(0, 2, -9, [WeaponType.MINIGUN, WeaponType.LAUNCHER, WeaponType.BFG]); // Heavy
        this.createWeaponRack(8, 2, -9, [WeaponType.KATANA, WeaponType.LIGHTSABER, WeaponType.AXE]);
        
        // Portal to Arena
        this.createPortal(0, 0, 8);
        
    }

    createWall(x, y, z, w, h, mat, rotate90 = false) {
        const geom = new THREE.BoxGeometry(w, h, 1);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, y, z);
        if (rotate90) mesh.rotation.y = Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.walls.push(mesh);
    }

    createWeaponRack(x, y, z, weapons) {
        const rackGroup = new THREE.Group();
        rackGroup.position.set(x, y, z);

        weapons.forEach((type, i) => {
            // Visual Placeholder (Box or simplistic model)
            // Or better: use WeaponFactory logic if possible, or just floating text for now?
            // Let's make a box with text/color.
            const cfg = WeaponConfig[type];
            if (!cfg) return;

            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.4, 0.2),
                new THREE.MeshStandardMaterial({ color: cfg.color || 0xffffff })
            );
            mesh.position.set((i - 1) * 2, 0, 0);
            rackGroup.add(mesh);
            
            // Interaction Node
            mesh.userData = { 
                isInteractable: true, 
                type: 'WEAPON_PICKUP', 
                weaponType: type 
            };
            this.game.interactables.push(mesh); // Need to register interactables in Game
        });

        this.scene.add(rackGroup);
    }

    createPortal(x, y, z) {
        const geom = new THREE.TorusGeometry(2, 0.2, 16, 100);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const portal = new THREE.Mesh(geom, mat);
        portal.position.set(x, y + 2, z);
        
        const glow = new THREE.PointLight(0x00ffff, 2, 10);
        glow.position.copy(portal.position);
        
        this.scene.add(portal);
        this.scene.add(glow);
        
        // Interaction / Collision trigger
        // For now, let's make it an interactable or distance check
        portal.userData = { isPortal: true, target: 'ARENA' };
        this.game.portals.push(portal); // Need Game support
        
        // Spawn Gunsmith
        const npc = new GunsmithNPC(this.scene, new THREE.Vector3(-5, 0, -5));
        // We might want to store him or update him? Gunsmith is simple mesh for now.
    }
}
