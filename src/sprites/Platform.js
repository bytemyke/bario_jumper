import Phaser from "phaser";

export default class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "platform");
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    scene.platforms.add(this);
  }
}
