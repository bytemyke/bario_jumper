import Phaser from "phaser";

export default class Platform extends Phaser.Physics.Arcade.StaticGroup {
    constructor(scene, x, y, type = 'basic') {
        super(scene.physics.world, scene);
        
        this.type = type;
        this.width = 3;
        
        // Create platform blocks
        for (let i = 0; i < this.width; i++) {
            // Use create instead of add for static bodies
            const block = this.create(x + (i * 16), y, 'platform', 462);
            block.setImmovable(true);
            block.refreshBody(); // Ensure physics body is updated
            block.setScrollFactor(1);
        }

        // No need to manually add to scene.platforms as StaticGroup handles this
    }
}