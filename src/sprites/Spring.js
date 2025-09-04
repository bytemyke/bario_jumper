// PSEUDOCODE: A lightweight sprite class that knows how to play its own bounce animation.
import Phaser from "phaser";

export default class Spring extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    // PSEUDOCODE: Use our new sheet; default to frame 0 (idle/compressed).
    super(scene, x, y, "green_spring", 0);

    // PSEUDOCODE: Add to scene/physics and make it static-ish like platforms.
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // immovable/static body

    // PSEUDOCODE: Create the animation once, only if the sheet exists and has frames.
const SPRING_ANIM_KEY = "spring_bounce";
const tex = scene.textures.get("green_spring");
if (!tex || tex.frameTotal < 3) {
  console.warn("[Spring] green_spring missing or mis-sized (need 3 frames at 16x24).");
} else if (!scene.anims.get(SPRING_ANIM_KEY)) {
  scene.anims.create({
    key: SPRING_ANIM_KEY,
    frames: scene.anims.generateFrameNumbers("green_spring", { start: 0, end: 2 }),
    frameRate: 18,
    repeat: 0,
  });
}


    this.setOrigin(0.5, 1);                 // sit on the platform top

    // PSEUDOCODE: Create the 3-frame animation once (idempotent).
    if (!scene.anims.exists("spring_bounce")) {
      scene.anims.create({
        key: "spring_bounce",
        frames: scene.anims.generateFrameNumbers("green_spring", { start: 0, end: 2 }),
        frameRate: 18,
        repeat: 0
      });
    }
  }

  // PSEUDOCODE: Public method to play bounce and signal hooks for Player’s spring-mode animation.
  playBounce(onComplete) {
    // PSEUDOCODE: Only play if the animation exists; avoid the Phaser "duration" crash.
// PSEUDOCODE: Only play if the animation exists and has frames; otherwise skip (no crash).
const k = "spring_bounce";
const a = this.scene.anims.get(k);
if (!a || !a.frames || a.frames.length === 0) {
  console.warn("[Spring] Missing/empty animation:", k, "-- check PreloadScene path/sizes.");
  if (onComplete) onComplete();
  return;
}
this.anims.play(k);

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (onComplete) onComplete();
    });
  }
}
