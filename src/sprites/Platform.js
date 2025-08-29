import Phaser from "phaser";

/**
 * Platform sprite that randomly chooses between available textures.
 * Spawning logic elsewhere (counts, positions, timing) is unchanged.
 *
 * Weighted 2:1 in favor of "castle_platform" so on average:
 *    castle_platform : basic_1  ≈  2 : 1
 */
export default class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = null) {
    const chosen = pickWeightedTexture(scene, texture);
    super(scene, x, y, chosen);

    // Add to scene & physics world (static body)
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 0.5);

    // Helpful flag (not required by the logic, but handy)
    this.isBasic = (this.texture && this.texture.key === "basic_1");

    // Ensure the physics body matches the texture/frame (no scaling needed)
    if (this.body && this.body.setSize) {
      // Use frame's real pixel size when available
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
      this.refreshBody?.();
    }

    // Register in the scene's platforms group
    scene.platforms.add(this);
  }
}

/** Choose texture with 2:1 weighting (castle:basic_1). Respects what's actually loaded. */
function pickWeightedTexture(scene, explicit) {
  if (explicit && scene.textures.exists(explicit)) return explicit;

  const haveCastle = scene.textures.exists("castle_platform");
  const haveBasic = scene.textures.exists("basic_1");

  if (haveCastle && !haveBasic) return "castle_platform";
  if (!haveCastle && haveBasic) return "basic_1";

  // Both available: weighted pick 2:1
  return Math.random() < (2 / 3) ? "castle_platform" : "basic_1";
}
