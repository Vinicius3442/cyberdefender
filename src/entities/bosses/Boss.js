import { Enemy } from '../Enemy.js';
import * as THREE from 'three';

export class Boss extends Enemy {
    constructor(scene, player, type, position) {
        super(scene, player, type); // Note: Enemy(scene, pos) consumes player as pos if mismatched
        this.player = player; // Fix: Store player reference
        this.isBoss = true;
        this.maxHp = 5000;
        this.hp = 5000;
        this.mesh.position.copy(position);
        
        // Cleanup default mesh from Enemy constructor if we plan to replace it
        // But for now subclasses will likely rebuild this.mesh
        
        // Boss Bar UI (Global or local?)
        // Ideally we emit an event or call a global UI manager
        this.updateBossUI();
    }

    takeDamage(amount) {
        super.takeDamage(amount);
        this.updateBossUI();
        
        if (this.hp <= 0) {
            this.onDeath();
        }
    }

    updateBossUI() {
        const bar = document.getElementById('boss-hp-bar');
        const container = document.getElementById('boss-container');
        const nameLabel = document.getElementById('boss-name');
        
        if (bar && container) {
            if (this.hp > 0) {
                container.style.display = 'block';
                const percent = Math.max(0, (this.hp / this.maxHp) * 100);
                bar.style.width = percent + '%';
                if (nameLabel) nameLabel.innerText = this.name || "BOSS";
            } else {
                container.style.display = 'none';
            }
        }
    }

    onDeath() {
        // Dramatic death effect
        // Override in subclass
        
        const container = document.getElementById('boss-container');
        if (container) container.style.display = 'none';
    }
}
