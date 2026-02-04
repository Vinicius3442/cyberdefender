import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';

export const WeaponType = {
    PISTOL: 'Pistol',
    REVOLVER: 'Revolver',
    DEAGLE: 'Desert Eagle',
    SILENCED_PISTOL: 'Silenced Pistol',
    DUAL_BERETTAS: 'Dual Berettas',
    ALIEN_BLASTER: 'Alien Blaster',
    
    SMG: 'SMG',
    VECTOR: 'Vector',
    TOMMY_GUN: 'Tommy Gun',
    P90: 'P90',
    MP5: 'MP5',
    
    SHOTGUN: 'Shotgun',
    SAWED_OFF: 'Sawed-Off',
    AUTO_SHOTGUN: 'AA-12',
    PUMP: 'Pump Shotgun',
    
    RIFLE: 'Rifle',
    FAMAS: 'Famas',
    M4A1: 'M4A1',
    SCAR: 'SCAR-H',
    LEVER_ACTION: 'Winchester',
    
    SNIPER: 'Sniper',
    BARRETT: 'Barrett .50',
    RAILGUN: 'Railgun',
    HUNTING_RIFLE: 'Hunting Rifle',
    
    LMG: 'LMG',
    MINIGUN: 'Minigun',
    GRENADE_LAUNCHER: 'Grenade Launcher',
    FLAMETHROWER: 'Flamethrower',
    FREEZE_RAY: 'Freeze Ray',
    LAUNCHER: 'AA Missile',
    BFG: 'BFG-8000',
    
    LASER: 'Laser Rifle',
    CROSSBOW: 'Crossbow',
    
    SWORD: 'Sword',
    KATANA: 'Katana',
    AXE: 'Battle Axe',
    KNIFE: 'Knife',
    BAT: 'Bat',
    SLEDGEHAMMER: 'Sledgehammer',
    LIGHTSABER: 'Lightsaber'
};

export const WeaponConfig = {
    // --- PISTOLS ---
    [WeaponType.PISTOL]: {
        damage: 20, fireRate: 0.3, spread: 0.01, magSize: 12, maxReserve: 60, projectileSpeed: 60, color: 0xffff00
    },
    [WeaponType.REVOLVER]: {
        damage: 60, fireRate: 0.6, spread: 0.005, magSize: 6, maxReserve: 36, projectileSpeed: 80, color: 0xffaa00
    },
    [WeaponType.DEAGLE]: {
        damage: 75, fireRate: 0.5, spread: 0.02, magSize: 7, maxReserve: 35, projectileSpeed: 90, color: 0xffd700
    },
    [WeaponType.SILENCED_PISTOL]: {
        damage: 25, fireRate: 0.2, spread: 0.0, magSize: 15, maxReserve: 75, projectileSpeed: 70, color: 0xcccccc
    },
    [WeaponType.DUAL_BERETTAS]: {
        damage: 18, fireRate: 0.15, spread: 0.05, magSize: 30, maxReserve: 120, projectileSpeed: 60, color: 0xffff00
    },
    [WeaponType.ALIEN_BLASTER]: {
        damage: 50, fireRate: 0.4, spread: 0.0, magSize: Infinity, maxReserve: Infinity, projectileSpeed: 40, color: 0x00ff00
    },

    // --- SMGS ---
    [WeaponType.SMG]: { // UZI
        damage: 10, fireRate: 0.12, spread: 0.08, magSize: 30, maxReserve: 150, projectileSpeed: 45, color: 0xffaa00
    },
    [WeaponType.VECTOR]: {
        damage: 8, fireRate: 0.06, spread: 0.04, magSize: 40, maxReserve: 200, projectileSpeed: 55, color: 0xffaa00
    },
    [WeaponType.TOMMY_GUN]: {
        damage: 12, fireRate: 0.15, spread: 0.1, magSize: 50, maxReserve: 200, projectileSpeed: 45, color: 0xffaa00
    },
    [WeaponType.P90]: {
        damage: 9, fireRate: 0.07, spread: 0.05, magSize: 50, maxReserve: 250, projectileSpeed: 60, color: 0x00ffff
    },
    [WeaponType.MP5]: {
        damage: 14, fireRate: 0.1, spread: 0.03, magSize: 30, maxReserve: 120, projectileSpeed: 50, color: 0xffff00
    },

    // --- SHOTGUNS ---
    [WeaponType.SHOTGUN]: { // Double Barrel
        damage: 10, pellets: 12, fireRate: 1.0, spread: 0.15, magSize: 2, maxReserve: 24, projectileSpeed: 50, color: 0xff0000
    },
    [WeaponType.SAWED_OFF]: {
        damage: 15, pellets: 8, fireRate: 0.8, spread: 0.25, magSize: 2, maxReserve: 30, projectileSpeed: 40, color: 0xff4444
    },
    [WeaponType.AUTO_SHOTGUN]: {
        damage: 8, pellets: 6, fireRate: 0.3, spread: 0.12, magSize: 12, maxReserve: 48, projectileSpeed: 55, color: 0xff0000
    },
    [WeaponType.PUMP]: {
        damage: 12, pellets: 10, fireRate: 0.8, spread: 0.1, magSize: 8, maxReserve: 40, projectileSpeed: 50, color: 0xffaaaa
    },

    // --- RIFLES ---
    [WeaponType.RIFLE]: { // AK-47
        damage: 25, fireRate: 0.2, spread: 0.02, magSize: 30, maxReserve: 90, projectileSpeed: 70, color: 0xffffaa
    },
    [WeaponType.FAMAS]: {
        damage: 22, fireRate: 0.15, spread: 0.01, magSize: 25, maxReserve: 100, projectileSpeed: 75, color: 0xffffaa, burst: 3
    },
    [WeaponType.M4A1]: {
        damage: 20, fireRate: 0.12, spread: 0.01, magSize: 30, maxReserve: 120, projectileSpeed: 80, color: 0xaaaaff
    },
    [WeaponType.SCAR]: {
        damage: 35, fireRate: 0.25, spread: 0.015, magSize: 20, maxReserve: 60, projectileSpeed: 85, color: 0xffddaa
    },
    [WeaponType.LEVER_ACTION]: {
        damage: 65, fireRate: 0.8, spread: 0.005, magSize: 8, maxReserve: 40, projectileSpeed: 40, gravity: 1.0, color: 0x8b4513
    },

    // --- SNIPERS ---
    [WeaponType.SNIPER]: { // AWP
        damage: 150, fireRate: 2.0, spread: 0.001, magSize: 5, maxReserve: 25, projectileSpeed: 300, scopeZoom: 0.15, color: 0x00ff00
    },
    [WeaponType.BARRETT]: {
        damage: 300, fireRate: 3.0, spread: 0.0, magSize: 5, maxReserve: 10, projectileSpeed: 400, scopeZoom: 0.1, color: 0xffffff
    },
    [WeaponType.RAILGUN]: {
        damage: 100, fireRate: 1.5, spread: 0.0, magSize: Infinity, maxReserve: Infinity, projectileSpeed: 1000, color: 0x0000ff // Instant
    },
    [WeaponType.HUNTING_RIFLE]: {
        damage: 90, fireRate: 1.0, spread: 0.005, magSize: 5, maxReserve: 30, projectileSpeed: 200, scopeZoom: 0.3, color: 0xaaffaa
    },

    // --- HEAVY ---
    [WeaponType.LMG]: {
        damage: 15, fireRate: 0.15, spread: 0.06, magSize: 100, maxReserve: 300, projectileSpeed: 50, color: 0xff4400
    },
    [WeaponType.MINIGUN]: {
        damage: 10, fireRate: 0.05, spread: 0.1, magSize: 500, maxReserve: 1000, projectileSpeed: 60, color: 0xff7700
    },
    [WeaponType.GRENADE_LAUNCHER]: {
        damage: 120, fireRate: 0.8, spread: 0.1, magSize: 6, maxReserve: 24, projectileSpeed: 20, gravity: 15.0, isExplosive: true, radius: 3.0, color: 0x005500
    },
    [WeaponType.FLAMETHROWER]: {
        damage: 5, fireRate: 0.04, spread: 0.2, magSize: 100, maxReserve: 400, projectileSpeed: 10, lifeTime: 0.5, color: 0xff5500
    },
    [WeaponType.FREEZE_RAY]: {
        damage: 2, fireRate: 0.1, spread: 0.05, magSize: 50, maxReserve: 200, projectileSpeed: 20, color: 0x00ffff
    },
    [WeaponType.LAUNCHER]: {
        damage: 200, fireRate: 3.5, spread: 0.05, magSize: 1, maxReserve: 10, projectileSpeed: 35, radius: 4.0, isExplosive: true, color: 0xff0000
    },
    [WeaponType.BFG]: {
        damage: 1000, fireRate: 5.0, spread: 0, magSize: 1, maxReserve: 5, projectileSpeed: 15, radius: 8.0, isBFG: true, color: 0x00ff00
    },
    
    // --- SPECIAL ---
    [WeaponType.LASER]: {
        damage: 8, fireRate: 0.08, spread: 0.0, magSize: 50, maxReserve: 200, projectileSpeed: 200, color: 0x00ffff
    },
    [WeaponType.CROSSBOW]: {
        damage: 80, fireRate: 1.2, spread: 0.01, magSize: 1, maxReserve: 30, projectileSpeed: 40, gravity: 5.0, color: 0x55ff55
    },

    // --- MELEE ---
    [WeaponType.SWORD]: { damage: 40, fireRate: 0.6, isMelee: true, range: 3.0, magSize: Infinity },
    [WeaponType.KATANA]: { damage: 30, fireRate: 0.3, isMelee: true, range: 2.5, magSize: Infinity },
    [WeaponType.AXE]: { damage: 80, fireRate: 1.2, isMelee: true, range: 3.5, magSize: Infinity },
    [WeaponType.KNIFE]: { damage: 25, fireRate: 0.2, isMelee: true, range: 1.5, magSize: Infinity },
    [WeaponType.BAT]: { damage: 35, fireRate: 0.5, isMelee: true, range: 2.0, magSize: Infinity },
    [WeaponType.SLEDGEHAMMER]: { damage: 100, fireRate: 1.5, isMelee: true, range: 3.0, magSize: Infinity },
    [WeaponType.LIGHTSABER]: { damage: 500, fireRate: 0.2, isMelee: true, range: 4.0, magSize: Infinity }
};
