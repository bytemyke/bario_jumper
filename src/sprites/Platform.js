import Phaser from "phaser";
import PLATFORM_TYPES from "../data/platformTypes.json";

/**
 * Resolves a texture key from a platform data row.
 * For now we only have "basic" type with 1 or 3 blocks.
 * - 1 block  -> "basic_1"
 * - 3 blocks -> "castle_platform"
 */
function resolveTextureKey(row) {
  if (row.type === "basic") {
    if (row.blocks === 1) return "basic_1";
    if (row.blocks === 3) return "castle_platform";
  }
  // Fallback (shouldn’t be hit with current data)
  return "basic_1";
}

/** Weighted pick among types that are actually loaded in the texture manager. */
function pickWeightedRow(scene, explicitKey) {
  // If explicit textureKey was provided and exists, prefer that (rarely used here)
  if (explicitKey && scene.textures.exists(explicitKey)) {
    // Try to find a matching row by key inference (not required for our flow)
    return null;
  }

  // Filter to rows whose resolved texture is available
  const available = PLATFORM_TYPES
    .map(row => ({ row, key: resolveTextureKey(row) }))
    .filter(({ key }) => scene.textures.exists(key));

  if (available.length === 0) {
    // As a safe fallback, pretend we have a 1-block basic
    return { row: { type: "basic", spawnPercent: 1, blocks: 1 }, key: "basic_1" };
  }

  const total = available.reduce((s, it) => s + (it.row.spawnPercent ?? 1), 0);
  let r = Math.random() * total;

  for (const it of available) {
    r -= (it.row.spawnPercent ?? 1);
    if (r <= 0) return it;
  }
  return available[available.length - 1];
}

export default class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey = null) {
    const picked = pickWeightedRow(scene, textureKey);
    const key = textureKey && scene.textures.exists(textureKey)
      ? textureKey
      : picked.key;

    super(scene, x, y, key);

    // Add to scene & physics world (static body)
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setOrigin(0.5, 0.5);

    // Attach metadata for spacing / head-clear logic
    const row = picked?.row ?? null;
    this.blocks = row?.blocks ?? (key === "castle_platform" ? 3 : 1);
    this.typeKey = key;
    this.isBasic = true; // current dataset is all "basic"

    // Ensure physics body matches the texture frame size
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
      this.refreshBody?.();
    }

    // Register in the scene's platforms group
    scene.platforms.add(this);
  }
}
