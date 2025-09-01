import Phaser from "phaser";
import PLATFORM_TYPES from "../data/platformTypes.json";

/**
 * Choose one platform row using relative weights.
 * Accepts either `spawnWeight` or `spawnPercent` fields; defaults to 1.
 */
function pickWeighted(rows) {
  const items = Array.isArray(rows) ? rows : [];
  const weights = items.map(r => Number(r.spawnWeight ?? r.spawnPercent ?? 1));
  const total = weights.reduce((a, b) => a + (isFinite(b) ? b : 0), 0) || 1;
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1] || { type: "basic", blocks: 3 };
}

/** With the TileType_TileAmount convention this is universal. */
function resolveTextureKey(row) {
  const type = row?.type ?? "basic";
  const blocks = row?.blocks ?? 3;
  return `${type}_${blocks}`;
}

/**
 * Platform GameObject with a static Arcade Physics body.
 * - Uses PLATFORM_TYPES to select a texture and set `.blocks`
 * - Adds itself to `scene.platforms` if present
 */
export default class Platform extends Phaser.GameObjects.Image {
  constructor(scene, x, y, row = null) {
    const chosen = row || pickWeighted(PLATFORM_TYPES);
    const key = resolveTextureKey(chosen);
    super(scene, x, y, key);

    this.type = chosen?.type ?? "basic";
    this.blocks = chosen?.blocks ?? 3;
    this.isEssential = false;
    this.isOptional = false;

    // Ensure present in the display list
    scene.add.existing(this);

    // Attach a STATIC arcade body
    scene.physics.add.existing(this, true);

    // sizing/origin
    this.setOrigin(0.5, 0.5);

    // Make sure the static body matches the current texture/frame
    if (this.body && this.body.setSize) {
      const fw = this.displayWidth || this.width;
      const fh = this.displayHeight || this.height;
      this.body.setSize(fw, fh, true);
      this.body.updateFromGameObject();
    }

    // Track inside the scene's static group (if created)
    if (scene.platforms && scene.platforms.add) {
      scene.platforms.add(this);
    }
  }

  /** Re-sync the static body after manual position/size changes. */
  refreshBody() {
    if (this.body && this.body.updateFromGameObject) {
      this.body.updateFromGameObject();
    }
  }
}
