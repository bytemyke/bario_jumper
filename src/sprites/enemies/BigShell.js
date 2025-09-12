import Phaser from "phaser";

/** High-level behavior:
 *  - Visual:
 *      • Uses "bigShell_<color>" if you add those assets later.
 *      • Otherwise tries a single-image key ("big_shell" or "bigShell") if preloaded.
 *      • Otherwise falls back to spikey shell art or "basic_3".
 *  - Spawn: placed on top of the host platform.
 *  - Modes: "walk" | "shell" | "shell_flying"
 *      • walk: patrol at low speed, turn at edges.
 *      • stomped from above → enter "shell" (stop moving, tint).
 *      • hit again while shell → kick to high speed for 5s ("shell_flying"), then destroy.
 *  - Player contact:
 *      • walk   → damages unless stomped.
 *      • shell  → second hit kicks the shell across the platform.
 */
export default class BigShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "bigShell";

  // Fill this with colors when you add assets like "bigShell_red.png".
  static COLORS = [];

  /**
   * CONSTRUCTOR
   *  - Selects an appropriate texture key via _chooseKey().
   *  - Creates the Arcade Sprite on top of the platform.
   *  - Sets up physics, platform collider, identity, and patrol behavior.
   *  - Starts in "walk" mode.
   */
  constructor(scene, platform, x = platform.x, color = null) {
    const key = BigShell._chooseKey(scene, color);
    const y = platform.y - platform.displayHeight / 2 - 8;

    super(scene, x, y, key);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    scene.physics.add.collider(this, scene.platforms);

    this.type = BigShell.TYPE;
    this.colors = BigShell.COLORS.slice();
    this.color = color;
    this.textureKey = key;

    this.homePlatform = platform;
    this.speed = 42;
    this.mode = "walk"; // "walk" | "shell" | "shell_flying"
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);
  }

  /**
   * static _chooseKey(scene, color)
   *  - If a colored bigShell_<color> exists, use it.
   *  - Else try single-image big-shell keys ("big_shell" then "bigShell").
   *  - Else fall back to spikeyShell_* (red → blue) then "basic_3".
   */
  static _chooseKey(scene, color) {
    const desired = color ? `bigShell_${color}` : null;
    if (desired && scene.textures.exists(desired)) return desired;

    if (scene.textures.exists("big_shell")) return "big_shell";
    if (scene.textures.exists("bigShell"))  return "bigShell";

    if (scene.textures.exists("spikeyShell_red"))  return "spikeyShell_red";
    if (scene.textures.exists("spikeyShell_blue")) return "spikeyShell_blue";

    return "basic_3";
  }

  /**
   * _initPatrolBounds()
   *  - Calculates left/right patrol limits derived from platform width.
   */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /**
   * preUpdate(time, delta)
   *  - While in "walk" mode, reverses direction at patrol edges each frame.
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
   *  - "shell": second hit kicks the shell horizontally; schedules destroy in 5s.
   *  - "shell_flying": (extend later if you want it to hurt things while flying).
   */
  onPlayerCollide(player) {
    if (this.mode === "walk") {
      if (this._isStomp(player)) return this._enterShell();
      return player?.takeDamage?.();
    }
    if (this.mode === "shell") {
      const dir = player.x < this.x ? 1 : -1; // kick away from player
      this.mode = "shell_flying";
      this.setVelocityX(340 * dir);
      this.scene.time.delayedCall(5000, () => this.destroy());
    }
  }

  /**
   * _isStomp(player)
   *  - Returns true when the player is moving downward and is above the shell enough to count as a stomp.
   */
  _isStomp(player) {
    return player?.body?.velocity?.y > 0 && player.y < this.y - this.displayHeight * 0.25;
  }

  /**
   * _enterShell()
   *  - Switches mode to "shell", stops horizontal movement, and tints for visual feedback.
   */
  _enterShell() {
    this.mode = "shell";
    this.setVelocityX(0);
    this.setTint(0x777777);
  }
}
