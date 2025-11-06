import Phaser from "phaser";

/**
 * Stump enemy (no tween/animation, shows frame 0 of its spritesheet).
 *
 * Behavior:
 *  - Spawns on top of a host platform.
 *  - Patrols left/right; turns at platform edges.
 *  - If the player stomps from above:
 *      • bounce the player upward,
 *      • flatten the stump (use frame 2 if available; otherwise scale the sprite),
 *      • immediately disable the stump’s physics & remove from enemies group,
 *      • destroy after a short delay.
 *  - If the contact is NOT a stomp: damage the player (player.takeDamage()).
 */
export default class Stump extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "stump";
  static COLORS = ["brown", "red", "blue"]; // spritesheet keys: stump_brown/red/blue (3x1)

  /**
   * CONSTRUCTOR
   * - Chooses a stump_<color> key that exists.
   * - Uses frame 0 (first cell in the 3x1 sheet) for idle/standing.
   * - Sets up physics, patrol bounds, and initial velocity.
   */
  constructor(scene, platform, x = platform.x, color = null) {
    const chosenColor = Stump._pickColor(scene, color);
    const desiredKey = `stump_${chosenColor}`;
    const fallbackKey = scene.textures.exists("stump_brown") ? "stump_brown" : null;

    const finalKey = scene.textures.exists(desiredKey)
      ? desiredKey
      : (fallbackKey ?? (scene.textures.exists("basic_3") ? "basic_3" : null));

    const y = platform.y - platform.displayHeight / 2 - 8;

    // Show the spritesheet, defaulting to frame 0 (the first column).
    super(scene, x, y, finalKey ?? "basic_3", 0);

    scene.add.existing(this);
    
    // If spritesheet was correctly sliced (>1 frames), force frame 0.
    {
      const tex = scene.textures.get(this.texture.key);
      if (tex && tex.frameTotal > 1) this.setFrame(0, true, true);
    }

    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    scene.physics.add.collider(this, scene.platforms);

    this.type = Stump.TYPE;
    this.color = chosenColor;
    this.textureKey = finalKey ?? "basic_3";

    this.homePlatform = platform;
    this.speed = 45;
    this._dying = false;  // one-shot flag when stomped
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);
    this._updateFacing();

    // Ensure the physics body matches the current frame (16x16)
    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
    }
  }

  /**
   * Choose an available color key (stump_<color>).
   */
  static _pickColor(scene, preferred) {
    const avail = Stump.COLORS.filter(c => scene.textures.exists(`stump_${c}`));
    if (preferred && avail.includes(preferred)) return preferred;
    return avail.length ? Phaser.Utils.Array.GetRandom(avail) : "brown";
  }

  /**
   * Compute patrol boundaries so the stump turns before the platform edge.
   */
  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  /**
   * Frame update: patrol unless we’re dying, and only if platform still exists.
   */
  preUpdate(t, d) {
    super.preUpdate(t, d);
    if (this._dying) return;
    if (!this.homePlatform || !this.homePlatform.active) return;

    if (this.x <= this.leftBound)  this.setVelocityX(Math.abs(this.speed));
    if (this.x >= this.rightBound) this.setVelocityX(-Math.abs(this.speed));
    this._updateFacing();
    
  }

  /**
   * Player overlap handler:
   * - Stomp → flatten & schedule destroy.
   * - Else → damage player.
   */
  onPlayerCollide(player) {
    if (this._dying) return;

    if (this._isStomp(player)) {
      this.scene.score += 15;
      this._dying = true;

      // Bounce the player up a bit so they separate cleanly.
      if (player?.body) player.setVelocityY(-240);

      // Flatten visual:
      // Try to use frame 2 (third cell) if the sheet has it; else scale down Y.
      const tex = this.scene.textures.get(this.texture.key);
      const hasThreeFrames = !!tex && tex.frameTotal >= 3;
      if (hasThreeFrames) {
        // use the "flatten" frame (convention: index 2)
        this.setFrame(2, true, true);
        this.setOrigin(0.5, 1);
        const platTop = this.homePlatform.y - this.homePlatform.displayHeight / 2;
this.x = Math.round(this.x);
this.y = Math.round(platTop);
      } else {
        // visual fallback: squash vertically
        this.setScale(1, 0.6);
      }

      // Immediately opt this enemy out of physics & overlaps so nothing touches it again.
      // 1) Remove from enemies group (so group colliders stop considering it).
      this.scene.enemies?.remove(this, false, false);

      // 2) Disable body collisions/updates right away.
      if (this.body) {
        this.body.checkCollision.none = true;
        this.body.enable = false;
      }

      // Keep it visible (so you see the flatten), then destroy shortly after.
      this.scene.time.delayedCall(450, () => {
        if (!this.scene || this.destroyed) return;
        this.destroy();
      });

      return;
    }

    // Not a stomp → deal damage.
    player?.takeDamage?.();
  }

  /**
   * True if the player is falling and above our top quarter (counts as a stomp).
   */
  _isStomp(player) {
    if (!player?.body || !this?.body) return false;
    const vy = player.body.velocity.y;      // +Y is downward in Arcade
    const tol = 6;                          // small tolerance
    const playerBottom = player.body.bottom;
    const stumpTop = this.body.top;
    return vy > 0 && playerBottom <= stumpTop + tol;
  }

  _updateFacing() {
  const vx = this.body?.velocity?.x ?? 0;
  if (vx > 0) this.setFlipX(false);
  else if (vx < 0) this.setFlipX(true);
}

}