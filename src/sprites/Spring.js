// A lightweight spring sprite that can be re-skinned and re-powered.
import Phaser from "phaser";

export default class Spring extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [opts]
   * @param {string} [opts.textureKey="green_spring"]  // which sheet to use
   * @param {number} [opts.strength=1]                 // 1 = normal, 2 = double
   */
  constructor(scene, x, y, opts = {}) {
    const textureKey = opts.textureKey || "green_spring";
    super(scene, x, y, textureKey, 0);

    this.textureKey = textureKey;
    this.strength = opts.strength == null ? 1 : Number(opts.strength);

    // Add to scene/physics (static-ish like platforms)
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 1); // feet sit on platform top

    // Build an animation key unique to the texture to avoid key collisions.
    this.animKey = `${textureKey}_bounce`;

    const tex = scene.textures.get(textureKey);
    if (!tex || tex.frameTotal < 3) {
      console.warn(
        `[Spring] "${textureKey}" missing or not 3 frames at 16x24.`
      );
    } else if (!scene.anims.get(this.animKey)) {
      scene.anims.create({
        key: this.animKey,
        frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 2 }),
        frameRate: 18,
        repeat: 0,
      });
    }
  }

  /** Stronger springs multiply these velocities. */
  getBodyBoostVy()   { return -900 * this.strength; }   // immediate body push
  getPlayerBoostVy() { return -950 * this.strength; }   // post-anim extra pop
  getPlayerModeBoostVy() { return -1200 * this.strength; } // Player spring-mode

  /** Play the bounce animation (if present) and call onComplete when done. */
  playBounce(onComplete) {
    const a = this.scene.anims.get(this.animKey);
    if (!a || !a.frames?.length) {
      if (onComplete) onComplete();
      return;
    }
    this.scene.sound.play("spring_sfx");
    this.anims.play(this.animKey, true);
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.setFrame(0); // reset upright
      if (onComplete) onComplete();
    });
  }
}
