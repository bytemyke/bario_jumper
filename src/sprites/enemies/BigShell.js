import Phaser from "phaser";

/**
 * BigShell enemy (3x1 spritesheet; frame 0 for idle).
 *
 * Modes:
 *  - "walk"  : patrol on the host platform; turn at edges.
 *  - "shell" : entered when the player stomps from above; stops, tints, shows frame 2 if available.
 *
 * Notes:
 *  - Your project currently ships only: bigShell_red.png
 *    (This class still accepts a few key-name variants for safety.)
 */
export default class BigShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "bigShell";

  constructor(scene, platform, x = platform.x, color = null) {
    // Prefer the real key you preload: "bigShell_red" (with a few tolerant variants)
    const key = BigShell._chooseKey(scene, color);

    // Place slightly above platform so Arcade settles it on top.
    const y = platform.y - platform.displayHeight / 2 - 8;

    // Create sprite; default to first frame of the sheet.
    super(scene, x, y, key, 0);
    scene.add.existing(this);
    this.setDepth(10); // render above platforms

    // If the texture has multiple frames, enforce frame 0 for idle.
    {
      const tex = scene.textures.get(this.texture.key);
      if (tex && tex.frameTotal > 1) this.setFrame(0);
    }

    // Physics + groups
    scene.physics.add.existing(this);
    scene.enemies?.add(this);

    // Grounding collider (mirrors Stump/SmallShell)
    scene.physics.add.collider(this, scene.platforms);

    // Identity/meta
    this.type = BigShell.TYPE;
    this.textureKey = key;

    // Movement / mode
    this.homePlatform = platform;
    this.speed = 42;
    this.mode = "walk";          // "walk" | "shell"
    this._modeCooldown = false;  // blocks duplicate state changes briefly
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);

    // Ensure the physics body matches the current frame (e.g., 16x16).
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
    }
  }

  /**
   * Prefer canonical "bigShell_red" (what you preload),
   * accept underscore/case variants, then minimal enemy fallback, then platform.
   */
  static _chooseKey(scene, color) {
    const variants = (base) => [
      base,                                   // bigShell_red
      base.replace("bigShell_", "big_Shell_"),// big_Shell_red
      base.replace("bigShell", "BigShell"),   // BigShell_red / BigShell
      base.replace("bigShell", "big_shell"),  // big_shell_red / big_shell
    ];

    const candidates = [];
    // Color parameter is ignored unless it's "red" (only art you have).
    if (color === "red") {
      candidates.push(...variants("bigShell_red"));
    } else {
      candidates.push(...variants("bigShell_red")); // default/only asset
    }

    // Optional enemy fallbacks you likely have
    candidates.push("spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red");

    // Absolute last resort
    candidates.push("basic_3");

    for (const k of candidates) {
      if (scene.textures.exists(k)) return k;
    }
    return "basic_3";
  }

  /** Compute patrol bounds from platform size with a small margin. */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /** Patrol only in "walk"; bail if the platform is gone. */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.mode !== "walk") return;
    if (!this.homePlatform || !this.homePlatform.active) return;

    if (this.x <= this.leftBound)  this.setVelocityX(Math.abs(this.speed));
    if (this.x >= this.rightBound) this.setVelocityX(-Math.abs(this.speed));
  }

  /**
   * Player overlap handler (wire with physics.overlap in your Scene):
   *  - "walk": stomp → enter shell; else damage + small bounce to separate.
   *  - "shell": (kick/push to be added later).
   */
  onPlayerCollide(player) {
    if (this.mode === "walk") {
      if (this._isStomp(player)) {
        this._enterShell(player);
        return;
      }
      player?.takeDamage?.();
      if (player?.body) player.setVelocityY(-160);
      return;
    }
    // "shell" kick/push behavior can be added when you're ready
  }

  /** True if the player is falling (vy > 0) and above our top quarter. */
  _isStomp(player) {
    if (!player || !player.body) return false;
    const vy = player.body.velocity?.y ?? 0; // +Y is downward
    return vy > 0 && player.y < this.y - this.displayHeight * 0.25;
  }

  /**
   * Safely enter "shell" state:
   *  - stop movement
   *  - frame 2 if available (shell/flatten look), tint for clarity
   *  - resize body to frame
   *  - bounce player up
   *  - brief non-collide window to avoid immediate retrigger
   */
  _enterShell(player) {
    if (this.mode !== "walk" || this._modeCooldown) return;
    this._modeCooldown = true;

    this.mode = "shell";
    this.setVelocityX(0);

    const tex = this.scene.textures.get(this.texture.key);
    if (tex && tex.frameTotal >= 3) {
      this.setFrame(2);
      if (this.body && this.body.setSize) {
        this.body.setSize(this.frame.realWidth, this.frame.realHeight, true);
      }
    }
    this.setTint(0x777777);

    if (player?.body) player.setVelocityY(-220);

    if (this.body) {
      this.body.checkCollision.none = true;
      this.scene.time.delayedCall(80, () => {
        if (this.body) this.body.checkCollision.none = false;
        this._modeCooldown = false;
      });
    } else {
      this._modeCooldown = false;
    }
  }
}
