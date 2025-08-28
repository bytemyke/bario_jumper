// Mushroom.js
import Phaser from "phaser";

export default class Mushroom extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mushroom");
    scene.anims.create({
      key: "mushroom",
      frames: [{ key: "mushroom", frame: 0 }, { key: "mushroom", frame: 1 }],
      frameRate: 1,
      repeat: 0,
    });
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    scene.collideWithMap(this);
    this.setBounce(0.2);
    this.setVelocityY(100); // start falling
    this.anims.play("mushroom");
  }
}
