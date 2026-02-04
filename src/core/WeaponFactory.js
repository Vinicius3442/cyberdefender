import * as THREE from 'three';
import { WeaponType } from './WeaponSystem.js';

export class WeaponFactory {
    static createWeaponMesh(type) {
        const group = new THREE.Group();
        
        // Materials (Reused)
        const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.5 });
        const matGrey = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.6 });
        const matDarkGrey = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
        const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
        const matGreen = new THREE.MeshStandardMaterial({ color: 0x2e4a2e, roughness: 0.6 });
        const matMetal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
        const matShiny = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
        const matGlowingGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const matGlowingBlue = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        // Helper
        const addBox = (w, h, d, x, y, z, mat, parent = group) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };
        const addCyl = (rTop, rBot, h, x, y, z, mat, parent = group) => {
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 16), mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };
        const addTorus = (r, tube, x, y, z, mat, parent = group) => {
            const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 16), mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };
        const addSphere = (r, x, y, z, mat, parent = group) => {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };

        switch (type) {
            // --- PISTOLS ---
            case WeaponType.PISTOL:
                addBox(0.06, 0.08, 0.3, 0, 0.05, 0, matGrey); 
                addBox(0.05, 0.15, 0.07, 0, -0.05, 0.05, matBlack).rotation.x = -0.15;
                addCyl(0.015, 0.015, 0.05, 0, 0.05, -0.16, matBlack).rotation.x = Math.PI/2;
                break;
            case WeaponType.REVOLVER:
                addCyl(0.03, 0.03, 0.3, 0, 0.08, -0.1, matMetal).rotation.x = Math.PI/2; // Barrel
                addCyl(0.045, 0.045, 0.08, 0, 0.08, 0.1, matGrey).rotation.x = Math.PI/2; // Cylinder
                addBox(0.04, 0.12, 0.06, 0, -0.05, 0.2, matWood).rotation.x = -0.2; // Grip
                break;
            case WeaponType.DEAGLE:
                addBox(0.06, 0.1, 0.4, 0, 0.08, 0, new THREE.MeshStandardMaterial({color: 0xffd700, metalness: 1.0, roughness: 0.1})); // Gold Body
                addBox(0.05, 0.15, 0.08, 0, -0.08, 0.1, matBlack).rotation.x = -0.1;
                break;
            case WeaponType.SILENCED_PISTOL:
                addBox(0.05, 0.08, 0.3, 0, 0.05, 0, matBlack);
                addBox(0.05, 0.12, 0.06, 0, -0.05, 0.1, matBlack);
                addCyl(0.03, 0.03, 0.2, 0, 0.05, -0.25, matDarkGrey).rotation.x = Math.PI/2; // Silencer
                break;
            case WeaponType.DUAL_BERETTAS:
                // Only one model here, logic handles dual rendering? 
                // Currently Player holds ONE visible model group.
                // Lets make the group contain TWO guns offset.
                const gunL = new THREE.Group();
                addBox(0.05, 0.08, 0.3, 0, 0.05, 0, matGrey, gunL);
                addBox(0.05, 0.12, 0.06, 0, -0.05, 0.1, matBlack, gunL).rotation.x = -0.1;
                gunL.position.x = -0.2;
                group.add(gunL);
                const gunR = gunL.clone();
                gunR.position.x = 0.2;
                group.add(gunR);
                break;
            case WeaponType.ALIEN_BLASTER:
                addCyl(0.04, 0.06, 0.3, 0, 0, 0, matGlowingGreen).rotation.x = Math.PI/2;
                addTorus(0.1, 0.01, 0, 0, -0.1, matMetal); // Rings?
                addBox(0.04, 0.12, 0.06, 0, -0.1, 0.1, matMetal).rotation.x = -0.3;
                break;

            // --- SMGS ---
            case WeaponType.SMG:
            case WeaponType.MP5:
                addBox(0.06, 0.08, 0.4, 0, 0, 0, matBlack);
                addCyl(0.02, 0.02, 0.15, 0, 0, -0.28, matGrey).rotation.x = Math.PI/2;
                addBox(0.03, 0.15, 0.05, 0, -0.05, 0, matDarkGrey); // Vertical Mag
                addBox(0.04, 0.12, 0.05, 0, -0.06, 0.2, matBlack); // Grip
                break;
            case WeaponType.VECTOR:
                addBox(0.06, 0.12, 0.35, 0, 0, 0, matBlack); // Main block
                addBox(0.04, 0.15, 0.05, 0, -0.05, -0.1, matDarkGrey).rotation.x = 0.2; // Angled Mag
                addBox(0.04, 0.12, 0.06, 0, -0.06, 0.15, matBlack);
                break;
            case WeaponType.TOMMY_GUN:
                addBox(0.06, 0.1, 0.5, 0, 0, 0, matBlack);
                addCyl(0.08, 0.08, 0.05, 0, -0.05, -0.1, matDarkGrey); // Drum Mag
                addBox(0.06, 0.1, 0.3, 0, -0.1, 0.25, matWood); // Stock
                addBox(0.04, 0.15, 0.05, 0, -0.1, -0.2, matWood); // Foregrip
                break;
            case WeaponType.P90:
                addBox(0.06, 0.12, 0.4, 0, 0, 0, matBlack);
                addBox(0.05, 0.04, 0.35, 0, 0.08, 0, new THREE.MeshStandardMaterial({color: 0x444444, transparent:true, opacity:0.8})); // Top Mag
                addBox(0.04, 0.08, 0.06, 0, -0.1, 0.15, matBlack); // Grip hole
                addBox(0.04, 0.08, 0.06, 0, -0.1, -0.1, matBlack); // Fore grip hole
                break;

            // --- SHOTGUNS ---
            case WeaponType.SHOTGUN:
            case WeaponType.SAWED_OFF:
                addCyl(0.02, 0.02, 0.5, 0.025, 0.02, -0.1, matGrey).rotation.x = Math.PI/2; 
                addCyl(0.02, 0.02, 0.5, -0.025, 0.02, -0.1, matGrey).rotation.x = Math.PI/2;
                addBox(0.08, 0.1, 0.2, 0, -0.05, 0.2, matWood); // Grip/Stock stub
                break;
            case WeaponType.AUTO_SHOTGUN:
                addBox(0.08, 0.12, 0.6, 0, 0, 0, matDarkGrey);
                addCyl(0.1, 0.1, 0.06, 0, -0.1, 0, matBlack); // Drum
                break;
            case WeaponType.PUMP:
                addBox(0.06, 0.12, 0.1, 0, -0.1, 0.15, matWood).rotation.x = -0.1; 
                addBox(0.08, 0.06, 0.6, 0, 0, -0.1, matBlack); 
                addBox(0.08, 0.04, 0.4, 0, -0.05, -0.1, matWood); 
                break;

            // --- RIFLES ---
            case WeaponType.RIFLE:
            case WeaponType.M4A1:
            case WeaponType.SCAR:
                addBox(0.06, 0.1, 0.4, 0, 0, 0, matDarkGrey);
                addCyl(0.015, 0.015, 0.1, 0, 0.02, -0.55, matGrey).rotation.x = Math.PI/2;
                addBox(0.06, 0.12, 0.3, 0, -0.05, 0.3, matBlack);
                addBox(0.04, 0.2, 0.08, 0, -0.15, 0, matGrey).rotation.x = 0.2; // Mag
                // Handle/Sight
                addBox(0.02, 0.06, 0.15, 0, 0.08, 0, matBlack);
                break;
            case WeaponType.FAMAS:
                addBox(0.06, 0.15, 0.5, 0, 0, 0, matBlack);
                addBox(0.02, 0.08, 0.4, 0, 0.12, 0, matBlack); // Carry handle
                addBox(0.04, 0.15, 0.08, 0, -0.1, 0.1, matGrey); // Mag behind grip? Bullpup
                break;
            case WeaponType.LEVER_ACTION:
                addBox(0.05, 0.08, 0.4, 0, 0, 0, matGrey);
                addBox(0.05, 0.1, 0.4, 0, -0.05, 0.4, matWood);
                addCyl(0.015, 0.015, 0.5, 0, 0.02, -0.45, matGrey).rotation.x = Math.PI/2;
                // Lever loop
                addTorus(0.04, 0.005, 0, -0.12, 0.2, matMetal);
                break;

            // --- SNIPERS ---
            case WeaponType.SNIPER:
            case WeaponType.BARRETT:
                addBox(0.08, 0.1, 0.6, 0, 0, 0.1, matDarkGrey);
                addCyl(0.03, 0.03, 1.2, 0, 0, -0.8, matGrey).rotation.x = Math.PI/2;
                addBox(0.08, 0.06, 0.15, 0, 0, -1.4, matGrey); // Muzzle
                addCyl(0.04, 0.04, 0.3, 0, 0.1, 0, matBlack).rotation.x = Math.PI/2; // Scope
                break;
            case WeaponType.RAILGUN:
                addBox(0.1, 0.15, 0.8, 0, 0, 0, matMetal);
                addCyl(0.02, 0.02, 1.0, 0.03, 0, -0.6, matGlowingBlue).rotation.x = Math.PI/2;
                addCyl(0.02, 0.02, 1.0, -0.03, 0, -0.6, matGlowingBlue).rotation.x = Math.PI/2;
                break;
            case WeaponType.HUNTING_RIFLE:
                addBox(0.05, 0.08, 0.8, 0, 0, 0, matWood);
                addCyl(0.015, 0.015, 0.4, 0, 0.02, -0.6, matGrey).rotation.x = Math.PI/2;
                break;

            // --- HEAVY ---
            case WeaponType.MINIGUN:
                const barrels = new THREE.Group();
                for(let i=0; i<6; i++) {
                    const angle = (i/6) * Math.PI * 2;
                    addCyl(0.015, 0.015, 0.8, Math.cos(angle)*0.06, Math.sin(angle)*0.06, 0, matGrey, barrels).rotation.x = Math.PI/2;
                }
                barrels.position.z = -0.4;
                group.add(barrels);
                addBox(0.15, 0.2, 0.4, 0, 0, 0.1, matGreen); // Body
                addCyl(0.2, 0.2, 0.3, 0, -0.2, 0.1, matDarkGrey); // Ammo Drum
                break;

            case WeaponType.FLAMETHROWER:
                addCyl(0.08, 0.08, 0.6, 0, 0, 0, matGrey).rotation.x = Math.PI/2; // Tank
                addCyl(0.02, 0.02, 0.8, 0.1, -0.1, -0.2, matBlack).rotation.x = Math.PI/2; // Nozzle
                addBox(0.06, 0.12, 0.1, 0.1, -0.2, 0.1, matGrey); // Handle
                break;
            case WeaponType.GRENADE_LAUNCHER:
                addCyl(0.1, 0.1, 0.6, 0, 0, 0, matDarkGrey).rotation.x = Math.PI/2; // Chamber
                addCyl(0.08, 0.08, 0.4, 0, 0, -0.5, matBlack).rotation.x = Math.PI/2; // Barrel
                addBox(0.05, 0.15, 0.1, 0, -0.15, 0.2, matWood); // Grip
                break;
            case WeaponType.FREEZE_RAY:
                addBox(0.12, 0.15, 0.5, 0, 0, 0, matWhite => new THREE.MeshStandardMaterial({color:0xeeeeff}));
                addSphere(0.08, 0, 0, -0.3, matGlowingBlue); // Bulb
                break;

            case WeaponType.LAUNCHER:
                addCyl(0.12, 0.12, 1.2, 0, 0, 0, matGreen).rotation.x = Math.PI/2;
                addBox(0.05, 0.15, 0.1, 0, -0.15, 0.2, matBlack);
                addBox(0.08, 0.08, 0.1, -0.1, 0.05, 0, matGrey);
                addCyl(0.11, 0.0, 0.15, 0, 0, -0.65, new THREE.MeshBasicMaterial({color:0xff0000})).rotation.x = Math.PI/2;
                break;
            case WeaponType.BFG:
                addBox(0.2, 0.25, 0.8, 0, 0, 0.1, matMetal);
                const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), matGlowingGreen);
                core.position.set(0, 0.05, 0); group.add(core);
                addBox(0.22, 0.05, 0.4, 0, 0.05, 0, matDarkGrey);
                addCyl(0.05, 0.02, 0.2, 0.15, 0, -0.4, matMetal).rotation.x = Math.PI/2;
                addCyl(0.05, 0.02, 0.2, -0.15, 0, -0.4, matMetal).rotation.x = Math.PI/2;
                break;

            // --- SPECIAL ---
            case WeaponType.LASER:
                addBox(0.08, 0.12, 0.6, 0, 0, 0, new THREE.MeshStandardMaterial({color:0xffffff}));
                addCyl(0.04, 0.04, 0.5, 0, 0, -0.1, matGlowingBlue).rotation.x = Math.PI/2;
                addBox(0.1, 0.02, 0.6, 0, 0.08, 0, matGrey);
                addBox(0.1, 0.02, 0.6, 0, -0.08, 0, matGrey);
                break;
            case WeaponType.CROSSBOW:
                addBox(0.06, 0.06, 0.6, 0, 0, 0, matWood);
                addCyl(0.02, 0.01, 0.6, -0.3, 0, -0.25, matMetal).rotation.z = Math.PI/4;
                addCyl(0.02, 0.01, 0.6, 0.3, 0, -0.25, matMetal).rotation.z = -Math.PI/4;
                break;
            case WeaponType.LMG:
                addBox(0.1, 0.15, 0.5, 0, 0, 0, matGreen);
                addCyl(0.03, 0.03, 0.6, 0, -0.02, -0.5, matBlack).rotation.x = Math.PI/2;
                addBox(0.12, 0.15, 0.15, 0.12, -0.05, 0, matGreen);
                break;

            // --- MELEE ---
            case WeaponType.SWORD:
                addBox(0.06, 0.8, 0.02, 0, 0.4, 0, matShiny);
                addBox(0.25, 0.04, 0.04, 0, 0, 0, matMetal);
                addCyl(0.025, 0.025, 0.25, 0, -0.15, 0, matWood);
                addBox(0.06, 0.06, 0.06, 0, -0.3, 0, matMetal);
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.KATANA:
                addBox(0.03, 1.0, 0.005, 0, 0.5, 0, matShiny);
                addCyl(0.06, 0.06, 0.01, 0, 0, 0, matBlack);
                addCyl(0.02, 0.02, 0.3, 0, -0.15, 0, matBlack);
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.AXE:
                addCyl(0.03, 0.03, 1.0, 0, 0, 0, matWood);
                addBox(0.4, 0.2, 0.05, 0, 0.4, 0, matMetal);
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.KNIFE:
                addBox(0.04, 0.3, 0.01, 0, 0.15, 0, matShiny);
                addCyl(0.03, 0.03, 0.12, 0, -0.06, 0, matBlack);
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.BAT:
                addCyl(0.06, 0.03, 0.8, 0, 0.4, 0, matWood);
                addCyl(0.03, 0.03, 0.2, 0, -0.1, 0, matBlack); // Grip
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.SLEDGEHAMMER:
                addCyl(0.03, 0.03, 0.9, 0, 0, 0, matDarkGrey);
                addBox(0.3, 0.15, 0.15, 0, 0.45, 0, matDarkGrey);
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            case WeaponType.LIGHTSABER:
                addCyl(0.03, 0.03, 0.25, 0, -0.12, 0, matMetal); // Hilt
                addCyl(0.04, 0.04, 1.0, 0, 0.5, 0, matGlowingGreen); // Blade
                group.rotation.set(-Math.PI/2, 0, -Math.PI/4);
                break;
            
            default:
                addBox(0.1, 0.1, 0.1, 0, 0, 0, matGrey); // Fallback
                break;
        }
        
        return group;
    }

    static createAmmoMesh() {
        const group = new THREE.Group();
        const matAmmo = new THREE.MeshStandardMaterial({ color: 0xcd7f32 }); // Bronze/Copper
        const matDark = new THREE.MeshStandardMaterial({ color: 0x222222 });

        // Banana Mag Shape (Curved Box approximation)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -0.1, 0.05),
            new THREE.Vector3(0, -0.2, 0.15)
        ]);

        const geometry = new THREE.TubeGeometry(curve, 8, 0.04, 6, false);
        const mesh = new THREE.Mesh(geometry, matDark);
        group.add(mesh);

        // Top bullet
        const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06), matAmmo);
        bullet.rotation.x = Math.PI / 2;
        bullet.position.y = 0.02;
        group.add(bullet);

        // Scale up slightly
        group.scale.set(1.5, 1.5, 1.5);
        
        return group;
    }
}
