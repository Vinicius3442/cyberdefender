import * as THREE from 'three';

export class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = null;
        this.currentLevelName = 'WASTELAND';
    }

    async loadLevel(levelName) {
        console.log("LEVEL_MANAGER: Loading Level", levelName);
        
        // 1. Unload Implementation (Optional)
        // If current level has cleanup, call it
        if (this.currentLevel && this.currentLevel.dispose) {
            this.currentLevel.dispose();
        }

        try {
            let LevelClass;
            
            // Dynamic Import Mapper
            switch(levelName) {
                case 'SPACE':
                    const sModule = await import('../levels/SpaceLevel.js');
                    LevelClass = sModule.SpaceLevel;
                    this.game.mode = 'SPACE_FLIGHT';
                    break;
                case 'CASTLE':
                    const cModule = await import('../levels/CastleLevel.js');
                    LevelClass = cModule.CastleLevel;
                    this.game.mode = 'SP'; // Standard FPS
                    break;
                default:
                    console.error("Unknown Level:", levelName);
                    return;
            }

            // 2. Instantiate and Enter
            this.currentLevelName = levelName;
            this.game.currentLevelName = levelName; // Sync with Game for checks
            
            this.currentLevel = new LevelClass(this.game);
            this.currentLevel.enter();
            
            console.log("LEVEL_MANAGER: Level loaded successfully.");
            
        } catch (err) {
            console.error("LEVEL_MANAGER: Failed to load level", levelName, err);
        }
    }

    update(dt) {
        if (this.currentLevel && this.currentLevel.isActive) {
            this.currentLevel.update(dt);
        }
    }
}
