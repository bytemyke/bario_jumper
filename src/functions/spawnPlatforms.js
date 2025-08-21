import Platform from '../sprites/Platform';

export function spawnPlatforms(scene, player) {
    // Check cooldown
    if (scene.lastPlatformSpawn && 
        scene.time.now - scene.lastPlatformSpawn < 2000) {
        return;
    }

    // Get jump velocity and calculate max height
    const jumpVelocity = 500;
    const gravity = scene.physics.world.gravity.y;
    const maxJumpHeight = Math.pow(jumpVelocity, 2) / (2 * gravity);

    // Get all platforms and sort by Y position
    const platforms = scene.platforms.getChildren();
    const sortedPlatforms = platforms.sort((a, b) => a.y - b.y);
    const highestPlatform = sortedPlatforms[0];
    //create the first 6 or so platforms in new function
    
    // If no platforms exist, create first one
    if (!highestPlatform) {
        const gameWidth = scene.sys.game.config.width;
        new Platform(scene, gameWidth / 2, player.y + 300);
        scene.lastPlatformSpawn = scene.time.now;
        return;
    }
    //make sure to spawn platforms ahead of time so that they are already ready (off screen) when the player may need them
    
    //delete function that will get rid of platforms that are too far below the player
    //have delete function handle the spawning of new platforms


    // Check if player has reached near the highest platform
    const reachedPlatform = player.y <= highestPlatform.y + 50;

    // Only spawn if player has reached near the highest platform
     if (reachedPlatform) {
        const gameWidth = scene.sys.game.config.width;
        const minX = 50;
        const maxX = gameWidth - 50;
        
        // Spawn platform at a random height within jump range
        const heightFactor = Phaser.Math.FloatBetween(0.4, 0.8);
        const newY = player.y - (maxJumpHeight * heightFactor);
        const newX = Phaser.Math.Between(minX, maxX);
        
        new Platform(scene, newX, newY);
        scene.lastPlatformSpawn = scene.time.now;
    }
}
    
    export function initializePlatforms(scene, player) {
        scene.platforms = scene.physics.add.staticGroup();
        scene.physics.add.collider(scene.player, scene.platforms); 
        const gameWidth = scene.sys.game.config.width;
        const initialPlatformData = [{x: 75, y: 50}, {x: 50, y: 75}, {x: 125, y: 100}, {x: 9000, y: 125}, {x: 11000, y: 1100}, {x: 13000, y: 1300}];
        initialPlatformData.forEach(data => {
            new Platform(scene, data.x, data.y);        
            
    })
};