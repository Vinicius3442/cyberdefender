import * as THREE from 'three';

export class Enemy {
    constructor(scene, position) {
        this.scene = scene;
        this.isDead = false;

        // Stats
        this.hp = 30;
        this.speed = 3;
        this.damage = 10;
        this.scoreValue = 100;

        // Mesh (Simple Box as requested)
        const geometry = new THREE.BoxGeometry(1, 2, 1); // Humanoid-ish proportions

        // Texture Loader
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('./assets/enemy_skin.png',
            () => { }, // onLoad
            () => { }, // onProgress
            (err) => {
                // onError: fallback to color if texture missing
                if (this.mesh && this.mesh.material) {
                    this.mesh.material.map = null;
                    this.mesh.material.color.setHex(0xff0000); // Red fallback
                    this.mesh.material.needsUpdate = true;
                }
            }
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White so texture shows
            map: texture
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 1; // Stand on floor
        this.mesh.castShadow = true;

        this.scene.add(this.mesh);
    }

    takeDamage(amount) {
        this.hp -= amount;
        // Flash white
        this.mesh.material.emissive.setHex(0xffffff);
        setTimeout(() => {
            if (!this.isDead) this.mesh.material.emissive.setHex(0x000000);
        }, 100);

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        // Particle effect could go here
    }

    update(dt, playerPosition) {
        // Override in subclasses
    }
}
