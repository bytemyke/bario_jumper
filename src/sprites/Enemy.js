import Phaser from "phaser";

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "enemy");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemies.add(this);
    this.setVelocityX(Phaser.Math.Between(-100, 100));
    this.setCollideWorldBounds(true);
    this.setBounce(1);
  }
}
