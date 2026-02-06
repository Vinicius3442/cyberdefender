import * as THREE from 'three';

export class ArenaLevel {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.traps = [];
    }

    build() {
        // Circular Arena
        const radius = 40;
        
        // Floor
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(radius, 64),
            new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 1.0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Walls (Audience Stands)
        const wallH = 10;
        const walls = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, wallH, 64, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide })
        );
        walls.position.y = wallH / 2;
        this.scene.add(walls);

        // Audience (Particles or Simple Billboards)
        this.createAudience(radius, wallH);

        // Traps
        this.createSpikes();
    }

    createAudience(radius, h) {
        // Simple ambient light logic or dots
        const particles = new THREE.BufferGeometry();
        const count = 500;
        const positions = [];
        
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = radius + 1 + Math.random() * 5;
            const y = 2 + Math.random() * (h - 2);
            positions.push(Math.cos(angle)*r, y, Math.sin(angle)*r);
        }
        
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.5 });
        this.scene.add(new THREE.Points(particles, pMat));
    }

    createSpikes() {
        // Random spikes logic
        // TODO
    }
}
