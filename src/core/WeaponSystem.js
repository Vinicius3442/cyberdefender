import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';

export const WeaponType = {
    PISTOL: 'Pistol',
    SHOTGUN: 'Shotgun', // New
    SMG: 'SMG',
    RIFLE: 'Rifle',
    LMG: 'LMG',
    SNIPER: 'Sniper',
    LASER: 'Laser Rifle', // New
    CROSSBOW: 'Crossbow', // New
    LAUNCHER: 'AA Missile',
    BFG: 'BFG-8000',
    SWORD: 'Sword',
    KATANA: 'Katana', // New
    AXE: 'Battle Axe' // New
};

export const WeaponConfig = {
    [WeaponType.PISTOL]: {
        damage: 20,
        fireRate: 0.4, // Slower
        spread: 0.01,
        ammo: 50,
        maxAmmo: 100,
        isMelee: false,
        projectileSpeed: 60,
        color: 0xffff00
    },
    [WeaponType.SHOTGUN]: {
        damage: 10, // Per pellet
        pellets: 8, // New property
        fireRate: 1.0, // Slow
        spread: 0.15, // Wide
        ammo: 20,
        maxAmmo: 40,
        isMelee: false,
        projectileSpeed: 50,
        color: 0xff0000
    },
    [WeaponType.SMG]: {
        damage: 10,
        fireRate: 0.12, // Slower than 0.08
        spread: 0.06,
        ammo: 120,
        maxAmmo: 240,
        isMelee: false,
        projectileSpeed: 45,
        color: 0xffaa00
    },
    [WeaponType.RIFLE]: {
        damage: 25,
        fireRate: 0.2, // Slower than 0.15
        spread: 0.02,
        ammo: 90,
        maxAmmo: 180,
        isMelee: false,
        projectileSpeed: 70,
        color: 0xffffaa
    },
    [WeaponType.LMG]: {
        damage: 15,
        fireRate: 0.15, // Slower than 0.1
        spread: 0.04,
        ammo: 200,
        maxAmmo: 400,
        isMelee: false,
        projectileSpeed: 50,
        color: 0xff4400
    },
    [WeaponType.SNIPER]: {
        damage: 150,
        fireRate: 2.0, // Very slow
        spread: 0.001,
        ammo: 10,
        maxAmmo: 20,
        isMelee: false,
        projectileSpeed: 300,
        scopeZoom: 0.15,
        color: 0x00ff00
    },
    [WeaponType.LASER]: {
        damage: 8,
        fireRate: 0.08, // Fast
        spread: 0.0, // Perfect accuracy
        ammo: 100,
        maxAmmo: 200,
        isMelee: false,
        projectileSpeed: 200, // Very fast
        color: 0x00ffff
    },
    [WeaponType.CROSSBOW]: {
        damage: 80,
        fireRate: 1.2,
        spread: 0.01,
        ammo: 30,
        maxAmmo: 60,
        isMelee: false,
        projectileSpeed: 40, // Slow
        gravity: 5.0, // Arcing
        color: 0x55ff55
    },
    [WeaponType.LAUNCHER]: {
        damage: 200,
        fireRate: 2.5,
        spread: 0.05,
        ammo: 10,
        maxAmmo: 20,
        isMelee: false,
        projectileSpeed: 35,
        radius: 4.0,
        color: 0xff0000
    },
    [WeaponType.BFG]: {
        damage: 1000,
        fireRate: 4.0,
        spread: 0,
        ammo: 3,
        maxAmmo: 5,
        isMelee: false,
        projectileSpeed: 15,
        radius: 8.0,
        color: 0x00ff00
    },
    [WeaponType.SWORD]: {
        damage: 40,
        fireRate: 0.6,
        isMelee: true,
        range: 3.0,
        ammo: Infinity
    },
    [WeaponType.KATANA]: {
        damage: 30,
        fireRate: 0.3, // Fast swing
        isMelee: true,
        range: 2.5,
        ammo: Infinity
    },
    [WeaponType.AXE]: {
        damage: 80,
        fireRate: 1.2, // Slow swing
        isMelee: true,
        range: 3.5,
        ammo: Infinity
    }
};
