import Platform from '../sprites/Platform';

export default function spawnPlatforms(scene, player) {
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

    // If no platforms exist, create first one
    if (!highestPlatform) {
        const gameWidth = scene.sys.game.config.width;
        new Platform(scene, gameWidth / 2, player.y - 100);
        scene.lastPlatformSpawn = scene.time.now;
        return;
    }

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