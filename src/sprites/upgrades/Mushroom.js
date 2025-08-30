import Phaser from "phaser";

export default class Mushroom extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mushroom");
    this.setScale(0.5);
    // create animation once
    if (!scene.anims.exists("mushroom_idle")) {
      scene.anims.create({
        key: "mushroom_idle",
        frames: [
          { key: "mushroom", frame: 0 },
          { key: "mushroom", frame: 1 },
        ],
        frameRate: 2,
        repeat: -1,
      });
    }
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(this.width, this.height);
    this.body.setOffset(0, 0);
    this.body.allowGravity = false;
    // scene.collideWithMap(this);
    this.setVelocityY(0);
    this.setBounce(0.2);
    this.anims.play("mushroom_idle");
    setTimeout(() => {
      this.body.allowGravity = true;
      this.setVelocityY(100); // start falling
    }, 20000);
  }
}
