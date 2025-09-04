import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mini_player");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(1);

    // PSEUDOCODE: Subscribe this Player to scene-wide spring events so we can start/stop its spring animation/state.
const onSpringStart = ({ player /*, spring */ }) => {
  if (player !== this) return;          // only react if THIS player triggered the spring
  // start player spring anim/state (you’ll wire your animation here)
  // e.g., this.play(`spring_${this.current_mode}`, true);
};

const onSpringEnd = ({ player /*, spring */ }) => {
  if (player !== this) return;          // only react if THIS player triggered the spring
  // stop player spring anim/state (revert to idle/run, etc.)
  // e.g., this.stop();
};

scene.events.on("spring:start", onSpringStart);
scene.events.on("spring:end",   onSpringEnd);


    // constants
    this.moveSpeed = 200;
    this.jumpSpeed = -500;

    // state
    this.current_mode = "mini";
    this.isTransforming = false;
    // Cam added: Track spring state, whether the spring animation is still playing, and where the platform top was.
  this._springActive = false;
  this._springAnimPlaying = false;   // true from spring:start → spring:end
  this._springSourceY = null;        // platform top Y for forgiving exit

    // input
    this.cursors = scene.input.keyboard.addKeys("W,A,S,D");

    // animations
    this.createAnimations(scene);
    this.play("idle_mini");

    // listen for anim completion
    this.on("animationcomplete", this.onAnimComplete, this);
    // PSEUDOCODE: Listen once for spring start/end to control spring-mode and animation gating.
if (!this._boundSpringListeners) {
  this._onSpringStart = ({ player, spring }) => {
    if (player !== this) return;
    this._springAnimPlaying = true;           // animation begins
    this.enterSpringMode({
      boostVy: -1200,                          // high upward velocity
      sourcePlatformY: spring?.y ?? null       // remember platform top for safe exit
    });
  };

  this._onSpringEnd = ({ player, spring }) => {
    if (player !== this) return;
    this._springAnimPlaying = false;           // animation finished; don't exit yet (forgiving)
    // PSEUDOCODE: Actual exit happens in update() once we’re safely above the platform.
  };

  this.scene.events.on("spring:start", this._onSpringStart);
  this.scene.events.on("spring:end",   this._onSpringEnd);
  this._boundSpringListeners = true;

  this.once(Phaser.GameObjects.Events.DESTROY, () => {
    this.scene.events.off("spring:start", this._onSpringStart);
    this.scene.events.off("spring:end",   this._onSpringEnd);
    this._boundSpringListeners = false;
  });
}

    
  }

  // ====== MODE HANDLING ======
  changeMode(newMode) {
    if (this.isTransforming || newMode === this.current_mode) return;

    if (newMode === "big") {
      this.isTransforming = true;
      this.body.setVelocity(0, 0);
      this.body.allowGravity = false;
      this.anims.stop();
      this.scene.physics.world.pause();

      this.setTexture("mini_to_big_one", 0);
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
    });

    // death
    a.create({
      key: "die",
      frames: [{ key: "mini_player", frame: 3 }],
    });
  }

  // Provide a clear API to start/stop spring mode—boost upward, disable collisions to pass through everything, and emit events so your animation system can hook in.
  // Spring MODE API (called by Spring.js) ======

/**
  Enter spring mode: launches the player upward and disables ALL collisions
  so we pass through platforms & enemies. Emits events so you can hook your
  custom player animation elsewhere.
 
  @param {{boostVy?: number, sourcePlatformY?: number}} opts
 */
enterSpringMode(opts = {}) {
  if (this._springActive) return;

  const boostVy = opts.boostVy ?? -1100;
  this._springSourceY = typeof opts.sourcePlatformY === "number" ? opts.sourcePlatformY : null;

  // Emit start hooks for your Player animation handler
  this.emit("spring:start");
  this.scene.events.emit("player:spring:start", this);

  // Disable all physical collisions while springing
  if (this.body?.checkCollision) {
    this.body.checkCollision.none = true;
  }

  // Big upward boost
  this.setVelocityY(boostVy);

  this._springActive = true;
}

/**
 * Exit spring mode: re-enable collisions and emit end hooks.
 * Safe to call more than once.
 */
exitSpringMode() {
  if (!this._springActive) return;

  // Re-enable collisions
  if (this.body?.checkCollision) {
    this.body.checkCollision.none = false;
  }

  // Emit end hooks for your Player animation handler
  this.emit("spring:end");
  this.scene.events.emit("player:spring:end", this);

  this._springActive = false;
  this._springSourceY = null;
}


  // ====== GAME LOOP ======
  update() {
    if (this.isTransforming) return;

    // While in spring mode, only end it after we’ve risen above the source platform and begun falling—this prevents clipping through platforms at different player sizes.
// ADD: spring-mode lifecycle check (runs every frame during spring mode)
if (this._springActive) {
  const bottom = this.body?.bottom ?? (this.y + (this.displayHeight || 0) / 2);
  const aboveSource = this._springSourceY == null ? true : (bottom < this._springSourceY - 2);
  const falling = (this.body?.velocity?.y ?? 0) >= 0;

  // Only end when we are ABOVE the source platform (avoid clipping)
  // AND we've peaked (velocity is downward or flat)
  if (falling && aboveSource) {
    this.exitSpringMode();
  }
  // Note: no 'return' — you can still steer mid-air while springing.
}


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
