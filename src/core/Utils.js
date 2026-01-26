export const Utils = {
    clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    },

    randomRange: (min, max) => {
        return Math.random() * (max - min) + min;
    },

    // Check collision between two boxes (AABB)
    // box1 and box2 are THREE.Box3 objects
    checkCollision: (box1, box2) => {
        return box1.intersectsBox(box2);
    },

    // Get a random position on the floor within a radius, excluding a safe zone center
    getRandomSpawnPosition: (radius, safeZoneRadius) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Utils.randomRange(safeZoneRadius, radius);
        return {
            x: Math.cos(angle) * dist,
            z: Math.sin(angle) * dist
        };
    }
};
