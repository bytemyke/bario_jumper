import Phaser from "phaser";

export default class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = "castle_platform") {
    super(scene, x, y, texture);

    // Add to scene & physics world
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // true = static body

    // Optional: tweak origin/scale
    this.setOrigin(0.5, 0.5);

    // Add to the scene's platforms group
    scene.platforms.add(this);
  }
}