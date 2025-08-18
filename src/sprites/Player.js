import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
    current_mode = "mini";
  constructor(scene, x, y) {
    super(scene, x, y, "player");

    // Add to scene + physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    this.moveSpeed = 200;
    this.jumpSpeed = -500;

    // Input
    this.cursors = scene.input.keyboard.addKeys("W,A,S,D");

    // Create animations
    this.createAnimations(scene);

    // Start idle
    this.anims.play("idle");
  }
  changeMode(mode) {
    //modeOptions = ["mini", "big", "fire"];
    this.current_mode = mode;
  }

  createAnimations(scene) {
    // Assuming your spritesheet is 16x16 per frame for example
    scene.anims.create({
      key: "idle",
      frames: [{ key: "player", frame: 0 }],
      frameRate: 1,
      repeat: 0,
    });

    scene.anims.create({
      key: "run",
      frames: [
        { key: "player", frame: 4 },
        { key: "player", frame: 5 },
        { key: "player", frame: 6 },
      ],
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: "jump",
      frames: [{ key: "player", frame: 2 }],
      frameRate: 1,
      repeat: 0,
    });
    scene.anims.create({
      key: "die",
      frames: [{ key: "player", frame: 3 }],
      frameRate: 1,
      repeat: 0,
    });
  }

  die() {
    //play sound
    this.setTint(0xff0000);
    this.anims.play("die");
  }

  update() {
    const onGround = this.body.blocked.down;

    // Horizontal movement
    if (this.cursors.A.isDown) {
      this.setVelocityX(-this.moveSpeed);
      this.flipX = true;
      if (onGround) this.anims.play("run", true);
    } else if (this.cursors.D.isDown) {
      this.setVelocityX(this.moveSpeed);
      this.flipX = false;
      if (onGround) this.anims.play("run", true);
    } else {
      this.setVelocityX(0);
      if (onGround) this.anims.play("idle", true);
    }

    // Jump
    if (this.cursors.W.isDown && onGround) {
      //add sound
      this.setVelocityY(this.jumpSpeed);
    }

    // Jump animation
    if (!onGround && this.body.velocity.x === 0) {
      this.anims.play("jump", true);
    }
  }
}
