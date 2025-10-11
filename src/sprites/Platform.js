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

    // moving plat flag
    this.isMoving = this.typeKey?.startsWith("moving_") || key.startsWith("moving_");
    this._moveTween = null;

    // Ensure physics body matches the texture frame size
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.refreshBody?.();
    }

    // Register in the scene's platforms group
    scene.platforms.add(this);

    // ===== Oscillator state (keeps EXACT same travel distance) =====
    this._oscRange = (this.blocks >= 2) ? 72 : 48;  // same as before
    this._oscSpeed = 60;                             // px/s (same as before)
    this._prevCenterX = this.x;
    this.dx = 0;

    this._oscInit = false;                           // [ADDED] lazy-capture center & dir
    // ===============================================================
  }

  // Move the sprite each frame, then sync the STATIC body to it
  preUpdate(time, delta) {
    super.preUpdate?.(time, delta);

    const body = /** @type {Phaser.Physics.Arcade.StaticBody} */ (this.body);
    if (!body) return;

    if (this.isMoving) {
      // [ADDED] Lazy initialization: use the REAL spawn X after spawner positioned us
      if (!this._oscInit) {                                        // [ADDED]
        this._oscStartX = this.x;                                  // [ADDED]
        this._oscDir = Math.random() < 0.5 ? -1 : 1;               // [ADDED]
        this._prevCenterX = this.x;                                // [ADDED]
        this._oscInit = true;                                      // [ADDED]
      }

      const range = this._oscRange;
      const minCenter = this._oscStartX - range;
      const maxCenter = this._oscStartX + range;

      // step distance this frame
      const step = this._oscSpeed * (delta / 1000) * this._oscDir;

      // compute next center x and bounce at edges
      let nextCenter = this.x + step;
      if (nextCenter > maxCenter) {
        nextCenter = maxCenter - (nextCenter - maxCenter); // reflect
        this._oscDir = -1;
      } else if (nextCenter < minCenter) {
        nextCenter = minCenter + (minCenter - nextCenter); // reflect
        this._oscDir = 1;
      }
      // --- Collide with map wall tiles (flip-and-escape; no clamping) ---
const mapData = this.scene.mapData;
const wallLayers = mapData ? [mapData.wall, mapData.wall2].filter(Boolean) : [];

if (wallLayers.length) {
  // simple debounce so we don't flip every frame while touching the wall
  if (!this._wallFlipUntil || time >= this._wallFlipUntil) {
    const halfW = (this.displayWidth ?? this.width ?? 0) * 0.5;
    const halfH = (this.displayHeight ?? this.height ?? 0) * 0.5;

    // probe 1px ahead in the direction we're moving
    const probeX = this._oscDir > 0 ? (nextCenter + halfW + 1) : (nextCenter - halfW - 1);
    const probeY = this.y - halfH + 4;

    let hitWall = false;
    for (const layer of wallLayers) {
      if (layer?.hasTileAtWorldXY?.(probeX, probeY)) { hitWall = true; break; }
    }

    if (hitWall) {
      // flip direction and take one step AWAY from the wall so we're no longer touching
      this._oscDir *= -1;

      const dt = (typeof delta === "number" ? delta : 16.7) / 1000;
      const stepAway = this._oscSpeed ? this._oscSpeed * dt : 40 * dt;

      nextCenter = this.x + (this._oscDir * Math.max(1, stepAway));

      // cooldown: ignore wall probe for ~120ms to prevent flicker
      this._wallFlipUntil = time + 120;
    }
  }
}
// --- end wall-collision block ---


  // Configure body collision: only on top
  if (this.body && this.body.checkCollision) {
  this.body.checkCollision.up = true;    // collide on top
  this.body.checkCollision.down = false; // ignore from below
  this.body.checkCollision.left = false; // ignore side-snag
  this.body.checkCollision.right = false;

  // Safety if any platforms use dynamic bodies:
  this.body.immovable = true;
  this.body.allowGravity = false;
  }


      // 1) Move the visual first
      const oldCenter = this.x;
      this.x = nextCenter;

      // 2) Sync the static body to the GameObject (authoritative hitbox)
      if (body.updateFromGameObject) body.updateFromGameObject();

      // 3) If these are in a StaticGroup, refresh its tree so collisions use the new position
      if (this.scene.platforms && typeof this.scene.platforms.refresh === "function") {
        this.scene.platforms.refresh();
      }

      // Track dx for player ride-along
      this.dx = nextCenter - (this._prevCenterX ?? nextCenter);
      this._prevCenterX = nextCenter;
    } else {
      // Non-moving: compute dx (usually 0) and keep static body in sync if externally moved
      const prev = this._prevCenterX ?? this.x;
      this.dx = this.x - prev;
      this._prevCenterX = this.x;
      if (body.updateFromGameObject) body.updateFromGameObject();
    }
  }

  //  movement helper
  _enableAutoMove() {
    // [REMOVED] No tweens; preUpdate drives movement and keeps hitbox bound.
    return;
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
