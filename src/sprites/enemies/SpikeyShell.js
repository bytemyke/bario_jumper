import Phaser from "phaser";

/**
 * High-level behavior:
 *  - Visual: chooses one of the preloaded textures "spikeyShell_<color>".
 *  - Spawn: placed on top of a given platform.
 *  - Patrol: walks left/right and turns around at the platform edges.
 *  - Player contact: always damages the player (no safe stomp).
 */
export default class SpikeyShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "spikeyShell";
  static FACES_RIGHT = false; 
  // Valid color suffixes (expected preloaded keys):
  //  "spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red", "spikeyShell_darkGrey"
  static COLORS = ["yellow", "blue", "red", "darkGrey"];

  /**
   * CONSTRUCTOR
   *  - Picks an available color key.
   *  - Falls back to spikeyShell_blue or basic_3.
   *  - Creates sprite on top of the platform, registers physics and patrol.
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

    // CHANGED: set initial direction (and flip) atomically
    this._setDir(Math.random() < 0.5 ? -1 : 1);
  }

  /** Choose an available color key (spikeyShell_<color>). */
  static _pickColor(scene, preferred) {
    const avail = SpikeyShell.COLORS.filter(c => scene.textures.exists(`spikeyShell_${c}`));
    if (preferred && avail.includes(preferred)) return preferred;
    return (avail.length ? Phaser.Utils.Array.GetRandom(avail) : "blue");
  }

  /** Compute patrol bounds so we turn before the platform edge. */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /** Turn around at patrol bounds each frame. */
  preUpdate(t, d) {
    super.preUpdate(t, d);
    if (this.x <= this.leftBound)  this._setDir(+1);
    if (this.x >= this.rightBound) this._setDir(-1);

    // UPDATED: keep (optional) velocity-based correction but now honors FACES_RIGHT
    this._updateFacing();
  }

  /** Spikey shells always hurt the player on contact. */
onPlayerCollide(player) {
  if (!this.active || !this.body || !player?.body) return;

  // SpikeyShell has no stomp-safe state — always hurt the player
  player?.takeDamage?.();
  // Give a small knockback / separation
  player.body && player.setVelocityY(-160);
}


  // UPDATED: honor FACES_RIGHT so this never fights _setDir()
  _updateFacing() {
    const vx = this.body?.velocity?.x ?? 0;
    const facesRight = (this.constructor.FACES_RIGHT !== false); // default true
    if (vx > 0) this.setFlipX(!facesRight);  // moving right
    else if (vx < 0) this.setFlipX(facesRight); // moving left
  }

  /**
   * Set walking direction and flip immediately.
   * dir: +1 (right), -1 (left), 0 (stop but keep last facing)
   */
  _setDir(dir) {
    this._dir = dir;

    // Move while in 'walk' (no other modes here, but future-proof)
    const canMove = (this.mode == null || this.mode === "walk");
    if (dir === 0 || !canMove) {
      this.setVelocityX(0);
    } else {
      const speed = this.speed ?? 60;
      this.setVelocityX(speed * dir);
    }

    // Flip now based on art’s default facing
    const facesRight = (this.constructor.FACES_RIGHT !== false); // default: true
    if (dir !== 0) {
      const flip = (dir > 0) ? !facesRight : facesRight;
      this.setFlipX(flip);
    }
  }
}
