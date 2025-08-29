import Phaser from "phaser";

/**
 * Platform sprite that randomly chooses between the available platform textures.
 * Spawning logic elsewhere is unchanged; we only vary the texture used.
 */
const PLATFORM_TEXTURE_KEYS = ["castle_platform", "basic_1"];

export default class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey) {
    // If a specific texture wasn't requested, pick a valid one at random
    const candidates = PLATFORM_TEXTURE_KEYS.filter((k) => scene.textures.exists(k));
    const chosen =
      textureKey ||
      (candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : "castle_platform");

    super(scene, x, y, chosen);

    // Add to scene & physics world (static body)
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 0.5);

    // Register in the scene's platforms group
    scene.platforms.add(this);
  }
}
