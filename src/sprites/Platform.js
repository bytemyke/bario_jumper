import Phaser from "phaser";
import PLATFORM_TYPES from "../data/PlatformTypes.json";

/** Weighted pick among PlatformTypes rows; build key dynamically and fallback to basic_3 if missing. */
function pickWeightedRow(scene, explicitKey) {
  // Use key if supplied and loaded:
  if (explicitKey && scene.textures.exists(explicitKey)) {
    return { row: null, key: explicitKey };
  }
  // Otherwise pick a weighted row from PLATFORM_TYPES data:
  const rows = (PLATFORM_TYPES && PLATFORM_TYPES.length)
    ? PLATFORM_TYPES
    : [{ type: "basic", spawnPercent: 1, blocks: 3 }];

  // Weighted choice
  const total = rows.reduce((s, r) => s + (r.spawnPercent ?? r.spawnWeight ?? 1), 0);
  let roll = Math.random() * total;
  let chosen = rows[0];
  for (const r of rows) {
    roll -= (r.spawnPercent ?? r.spawnWeight ?? 1);
    if (roll <= 0) { chosen = r; break; }
  }

  // Build desired texture key: row.type + "_" + row.basic (fallback to row.blocks)
 const suffix = (chosen && (chosen.basic ?? chosen.blocks)) ?? 1; // supports either "basic" or "blocks"
const desiredKey = `${chosen.type}_${suffix}`;


  // Your requested fallback: if key isn’t loaded, use "basic_3"
  const key = scene.textures.exists(desiredKey) ? desiredKey : "basic_3";

  return { row: chosen, key, logicalKey: desiredKey };
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
    this.typeKey = picked?.logicalKey ?? key;   // tracks the chosen row even if texture fell back
    this.isFalling = key.startsWith("falling_");
    this.isBasic = true; // current dataset is all "basic"

    // Ensure physics body matches the texture frame size
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
            this.refreshBody?.();
    }

    // Register in the scene's platforms group
    scene.platforms.add(this);
  } 

  /**
   * Cam added" falling platforms: log, then after a short Phaser delay, destroy this platform.
   * Guarded so it only runs once even if called multiple times.
   */
  falling(delayMs = 400) {
    if (this._fallingStarted) return;
    this._fallingStarted = true;

    console.log("falling");

    // Use Phaser’s clock (NOT setTimeout)
    this.scene.time.delayedCall(
      delayMs,
      () => {
        // Destroy the platform sprite + static body; safely removes it from the group as well
        this.destroy();
      },
      null,
      this
    );
  }
} // <-- end class

