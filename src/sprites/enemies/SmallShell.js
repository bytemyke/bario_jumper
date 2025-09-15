import Phaser from "phaser";

/**
 * SmallShell enemy (3x1 spritesheet; frame 0 for idle).
 *
 * Modes:
 *  - "walk"  : patrol on the host platform, turn at edges.
 *  - "shell" : entered when the player stomps from above; stops, tints, shows frame 2 if available.
 *
 * Notes:
 *  - Only two textures are expected to exist in your project right now:
 *      • smallShell_blue.png
 *      • smallShell_darkGrey.png
 *    (We also accept underscore / case variants for safety.)
 */
export default class SmallShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "smallShell";

  constructor(scene, platform, x = platform.x, color = null) {
    // Choose a usable key; prefer smallShell_blue / smallShell_darkGrey
    const key = SmallShell._chooseKey(scene, color);

    // Place slightly above platform top so it rests on it after physics step
    const y = platform.y - platform.displayHeight / 2 - 8;

    // Create sprite; default to first frame
    super(scene, x, y, key, 0);
    scene.add.existing(this);
    this.setDepth(10); // keep above platforms visually

    // If sliced, ensure frame 0
    {
      const tex = scene.textures.get(this.texture.key);
      if (tex && tex.frameTotal > 1) this.setFrame(0);
    }

    // Physics + groups
    scene.physics.add.existing(this);
    scene.enemies?.add(this);

    // Grounding collider (mirrors Stump.js)
    scene.physics.add.collider(this, scene.platforms);

    // Identity/meta
    this.type = SmallShell.TYPE;
    this.textureKey = key;

    // Movement / mode
    this.homePlatform = platform;
    this.speed = 58;
    this.mode = "walk";          // "walk" | "shell"
    this._modeCooldown = false;  // prevents duplicate state changes
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);

    // Body = current frame size (e.g., 16x16)
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
    }
  }

  /**
   * Texture chooser (aware you only ship: blue, darkGrey).
   * Tries canonical keys first, then common key-variant spellings
   * (underscore / capital S), then minimal enemy fallbacks, then platform.
   */
  static _chooseKey(scene, color) {
    const variants = (base) => [
      base,                                              // smallShell_blue
      base.replace("smallShell_", "small_Shell_"),       // small_Shell_blue
      base.replace("smallShell_", "SmallShell_"),        // SmallShell_blue
    ];

    const want = [];
    // Only support the two known colors in this build
    const allowed = ["blue", "darkGrey"];

    if (color && allowed.includes(color)) {
      want.push(...variants(`smallShell_${color}`));
    } else {
      // Try both known textures (order: blue, then darkGrey)
      want.push(...variants("smallShell_blue"));
      want.push(...variants("smallShell_darkGrey"));
    }

    // Minimal enemy fallbacks (optional): use any spikey you actually have loaded
    want.push("spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red");

    // Absolute last resort
    want.push("basic_3");

    for (const k of want) {
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

  /** Patrol only in "walk"; bail if platform is gone. */
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
   *  - "shell": kicking/pushing logic can be added next.
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
    // shell logic (kick/push) will be added later
  }

  /** True if player is falling (vy > 0) and above our top quarter (counts as a stomp). */
  _isStomp(player) {
    if (!player || !player.body) return false;
    const vy = player.body.velocity?.y ?? 0;
    return vy > 0 && player.y < this.y - this.displayHeight * 0.25;
  }

  /**
   * Safely enter "shell" state:
   *  - stop moving
   *  - frame 2 if available (flatten look), tint for clarity
   *  - resize body to frame
   *  - bounce player up
   *  - brief non-collide to avoid immediate retrigger
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
