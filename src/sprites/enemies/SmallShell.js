import Phaser from "phaser";

/**
 * SmallShell enemy (no tween/animation).
 *
 * High-level behavior:
 *  - Visual:
 *      • Uses "smallShell_<color>" if you add those assets later.
 *      • Otherwise falls back to spikey shell art or "basic_3".
 *  - Spawn: placed on top of the host platform.
 *  - Modes: "walk" | "shell" | "shell_flying" (same rules as BigShell, slightly faster).
 *  - Player contact:
 *      • walk   → damages unless stomped.
 *      • shell  → second hit kicks the shell for 5s, then destroy.
 */
export default class SmallShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "smallShell";

  // Fill with colors once you add "smallShell_<color>.png" assets.
  static COLORS = [];

  /**
   * CONSTRUCTOR
   *  - Chooses a texture with _chooseKey() (colored smallShell if present, else spikey fallback).
   *  - Creates the Arcade Sprite on the platform top.
   *  - Sets physics, platform collider, identity, and patrol behavior.
   *  - Starts in "walk" mode, slightly faster than BigShell.
   */
  constructor(scene, platform, x = platform.x, color = null) {
    const key = SmallShell._chooseKey(scene, color);
    const y = platform.y - platform.displayHeight / 2 - 8;

    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    scene.physics.add.collider(this, scene.platforms);

    this.type = SmallShell.TYPE;
    this.colors = SmallShell.COLORS.slice();
    this.color = color;
    this.textureKey = key;

    this.homePlatform = platform;
    this.speed = 58;       // faster baseline than BigShell
    this.mode = "walk";    // "walk" | "shell" | "shell_flying"
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);
  }

  /**
   * static _chooseKey(scene, color)
   *  - If "smallShell_<color>" exists, use it.
   *  - Otherwise try spikeyShell (yellow → blue) as a visible fallback.
   *  - Otherwise revert to "basic_3".
   */
  static _chooseKey(scene, color) {
    const desired = color ? `smallShell_${color}` : null;
    if (desired && scene.textures.exists(desired)) return desired;
    if (scene.textures.exists("spikeyShell_yellow")) return "spikeyShell_yellow";
    if (scene.textures.exists("spikeyShell_blue"))   return "spikeyShell_blue";
    return "basic_3";
  }

  /**
   * _initPatrolBounds()
   *  - Calculates its patrol range from the platform’s bounds.
   */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /**
   * preUpdate(time, delta)
   *  - While in "walk" mode, turn around at the patrol edges.
   */
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.mode !== "walk") return;
    if (this.x <= this.leftBound)  this.setVelocityX(Math.abs(this.speed));
    if (this.x >= this.rightBound) this.setVelocityX(-Math.abs(this.speed));
  }

  /**
   * onPlayerCollide(player)
   *  - "walk": if stomped from above → enter shell; else damage player.
   *  - "shell": kick horizontally; destroy after 5s.
   */
  onPlayerCollide(player) {
    if (this.mode === "walk") {
      if (this._isStomp(player)) return this._enterShell();
      return player?.takeDamage?.();
    }
    if (this.mode === "shell") {
      const dir = player.x < this.x ? 1 : -1;
      this.mode = "shell_flying";
      this.setVelocityX(360 * dir); // slightly faster kick than BigShell
      this.scene.time.delayedCall(5000, () => this.destroy());
    }
  }

  /**
   * _isStomp(player)
   *  - Returns true when the player is moving downward and sufficiently above the shell.
   */
  _isStomp(player) {
    return player?.body?.velocity?.y > 0 && player.y < this.y - this.displayHeight * 0.25;
  }

  /**
   * _enterShell()
   *  - Switches mode to "shell", stops movement, and tints as a visual cue.
   */
  _enterShell() {
    this.mode = "shell";
    this.setVelocityX(0);
    this.setTint(0x777777);
  }
}
