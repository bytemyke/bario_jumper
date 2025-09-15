import Phaser from "phaser";

/**
 * SpikeyShell enemy (no tween/animation).
 *
 * High-level behavior:
 *  - Visual: chooses one of the preloaded textures "spikeyShell_<color>".
 *  - Spawn: placed on top of a given platform.
 *  - Patrol: walks left/right and turns around at the platform edges.
 *  - Player contact: always damages the player (no safe stomp).
 */
export default class SpikeyShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "spikeyShell";

  // Valid color suffixes (expected preloaded keys):
  //  "spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red", "spikeyShell_darkGrey"
  static COLORS = ["yellow", "blue", "red", "darkGrey"];

  /**
   * CONSTRUCTOR
   * What it does:
   *  - Picks an available color and uses "spikeyShell_<color>" as preferred key.
   *  - Falls back to "spikeyShell_blue" (if present) or "basic_3".
   *  - Creates the Arcade Sprite on top of the platform.
   *  - Registers physics, platform collider, and initial patrol behavior.
   */
  constructor(scene, platform, x = platform.x, color = null) {
    const chosenColor = SpikeyShell._pickColor(scene, color);
    const desiredKey = `spikeyShell_${chosenColor}`;
    const fallbackKey = scene.textures.exists("spikeyShell_blue") ? "spikeyShell_blue" : null;

    const finalKey = scene.textures.exists(desiredKey)
      ? desiredKey
      : (fallbackKey ?? (scene.textures.exists("basic_3") ? "basic_3" : null));

    const y = platform.y - platform.displayHeight / 2 - 8;
    super(scene, x, y, finalKey ?? "basic_3");

    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    scene.physics.add.collider(this, scene.platforms);

    this.type = SpikeyShell.TYPE;
    this.color = chosenColor;
    this.textureKey = finalKey ?? "basic_3";

    this.homePlatform = platform;
    this.speed = 55;
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);
  }

  /**
   * static _pickColor(scene, preferred)
   *  - Returns preferred if its corresponding texture exists.
   *  - Otherwise returns a random color from loaded ones.
   *  - Else falls back to "blue".
   */
  static _pickColor(scene, preferred) {
    const avail = SpikeyShell.COLORS.filter(c => scene.textures.exists(`spikeyShell_${c}`));
    if (preferred && avail.includes(preferred)) return preferred;
    return (avail.length ? Phaser.Utils.Array.GetRandom(avail) : "blue");
  }

  /**
   * _initPatrolBounds()
   *  - Calculates patrol limits based on platform width and margins.
   */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /**
   * preUpdate(t, d)
   *  - Flips direction at patrol bounds each frame update.
   */
  preUpdate(t, d) {
    super.preUpdate(t, d);
    if (this.x <= this.leftBound)  this.setVelocityX(Math.abs(this.speed));
    if (this.x >= this.rightBound) this.setVelocityX(-Math.abs(this.speed));
  }

  /**
   * onPlayerCollide(player)
   *  - Spikey shells always hurt the player on contact.
   */
  onPlayerCollide(player) {
    player?.takeDamage?.();
  }
}
