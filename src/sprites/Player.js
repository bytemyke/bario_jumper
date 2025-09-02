import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mini_player");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(1);

    // constants
    this.moveSpeed = 200;
    this.jumpSpeed = -500;

    // state
    this.current_mode = "mini";
    this.isTransforming = false;

    // input
    this.cursors = scene.input.keyboard.addKeys("W,A,S,D");

    // animations
    this.createAnimations(scene);
    this.play("idle_mini");

    // listen for anim completion
    this.on("animationcomplete", this.onAnimComplete, this);
  }

  // ====== MODE HANDLING ======
  changeMode(newMode) {
    console.log(this.isTransforming);
    if (this.isTransforming || newMode === this.current_mode) return;
    console.log(newMode);
    if (newMode === "big") {
      this.isTransforming = true;
      console.log(this.isTransforming);
      this.body.setVelocity(0, 0);
      this.body.allowGravity = false;
      this.anims.stop();
      this.setTexture("mini_to_big", 0);
      console.log(this.texture);
      this.play("transform_mini");
    }
  }

  onAnimComplete(anim) {
    if (anim.key !== "transform_mini") return;

    if (this.current_mode === "big") {
      this.setMode("mini", 18, 17);
    } else {
      this.setMode("big", 32, 33);
    }
  }

  setMode(mode, w, h) {
    this.current_mode = mode;
    this.setTexture(`${mode}_player`, 0);
    this.body.setSize(w, h).setOffset(0, 0);
    this.body.allowGravity = true;

    this.isTransforming = false;
    this.play(`idle_${mode}`);
    this.scene.physics.world.resume();
  }

  // ====== ANIMATIONS ======
  createAnimations(scene) {
    const a = scene.anims;

    // transform
    a.create({
      key: "transform_mini",
      frames: a.generateFrameNumbers("mini_to_big", { start: 0, end: 9 }),
      frameRate: 18,
      repeat: 0,
    });

    // mini
    a.create({ key: "idle_mini", frames: [{ key: "mini_player", frame: 0 }] });
    a.create({
      key: "run_mini",
      frames: a.generateFrameNumbers("mini_player", { start: 4, end: 6 }),
      frameRate: 8,
      repeat: -1,
    });
    a.create({
      key: "jump_mini",
      frames: [{ key: "mini_player", frame: 2 }],
      frameRate: 1,
      repeat: 0,
    });

    // big
    a.create({ key: "idle_big", frames: [{ key: "big_player", frame: 0 }] });
    a.create({
      key: "run_big",
      frames: a.generateFrameNumbers("big_player", { start: 4, end: 6 }),
      frameRate: 8,
      repeat: -1,
    });
    a.create({
      key: "jump_big",
      frames: [{ key: "big_player", frame: 2 }],
      frameRate: 1,
      repeat: 0,
    });

    // death
    a.create({
      key: "die",
      frames: [{ key: "mini_player", frame: 3 }],
    });
  }

  // ====== GAME LOOP ======
  update() {
    if (this.isTransforming) return;

    const onGround = this.body.blocked.down;
    const { A, D, W } = this.cursors;

    // movement
    if (A.isDown) {
      this.setVelocityX(-this.moveSpeed);
      this.flipX = true;
      if (onGround) this.play(`run_${this.current_mode}`, true);
    } else if (D.isDown) {
      this.setVelocityX(this.moveSpeed);
      this.flipX = false;
      if (onGround) this.play(`run_${this.current_mode}`, true);
    } else {
      this.setVelocityX(0);
      if (onGround) this.play(`idle_${this.current_mode}`, true);
    }

    // jump
    if (W.isDown && onGround) {
      this.setVelocityY(this.jumpSpeed);
    }

    // airborne anim
    if (!onGround) {
      this.play(`jump_${this.current_mode}`, true);
    }
  }

  die() {
    this.setTint(0xff0000).play("die");
  }
}
