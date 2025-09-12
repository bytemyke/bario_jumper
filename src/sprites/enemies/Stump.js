import Phaser from "phaser";

/**
 * Stump enemy:
 * - Picks a random available color and uses texture key: stump_<color>
 * - Spawns on top of its host platform
 * - Patrols left/right by reversing at platform edges
 * - If player lands on top => dies after a short delay
 * - Otherwise => damages player (calls player.takeDamage())
 * - No tweens/animations here (left for teammate)
 */
export default class Stump extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "stump";
  static COLORS = ["brown", "red", "blue"]; // expected filenames/keys: stump_brown, stump_red, stump_blue

  constructor(scene, platform, x = platform.x, color = null) {
    // 1) Decide which color to use; prefer requested color if its texture is loaded, otherwise pick a random available
    const chosenColor = Stump._pickColor(scene, color);

    // 2) Build the preferred texture key: stump_<color>
    const desiredKey = `stump_${chosenColor}`;

    // 3) Prepare a stump fallback (avoid platform art when possible)
    const fallbackKey = scene.textures.exists("stump_brown") ? "stump_brown" : null;

    // 4) Choose the final texture key: desired stump color, else stump_brown fallback, else last-resort basic_3
    const finalKey = scene.textures.exists(desiredKey)
      ? desiredKey
      : (fallbackKey ?? (scene.textures.exists("basic_3") ? "basic_3" : null));

    // 5) Compute a Y position that places the enemy on top of the platform (slightly above the top surface)
    const y = platform.y - platform.displayHeight / 2 - 8;

    // 6) Construct the Phaser sprite with the final texture key
    super(scene, x, y, finalKey ?? "basic_3");

    // 7) Add to scene & enable arcade physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 8) If the scene has an enemies group, add us to it (helps with colliders/overlaps)
    scene.enemies?.add(this);

    // 9) Make this enemy collide with platforms so it can stand/patrol
    scene.physics.add.collider(this, scene.platforms);

    // 10) Identity/metadata for game logic
    this.type = Stump.TYPE;
    this.color = chosenColor;
    this.textureKey = finalKey ?? "basic_3";

    // 11) Save the host platform reference
    this.homePlatform = platform;

    // 12) Movement setup: patrol speed and patrol boundaries derived from platform width
    this.speed = 45;
    this._initPatrolBounds();

    // 13) Basic physics behavior: no world-bounds collision, small bounce, initial horizontal direction random
    this.setBounce(0).setCollideWorldBounds(false);
    this.setVelocityX(Math.random() < 0.5 ? -this.speed : this.speed);

    // NOTE: No animation/tweens here by request
  }

  // Picks a valid color that has a loaded texture; falls back to "brown" if nothing is loaded
  static _pickColor(scene, preferred) {
    const avail = Stump.COLORS.filter(c => scene.textures.exists(`stump_${c}`));
    if (preferred && avail.includes(preferred)) return preferred;
    return (avail.length ? Phaser.Utils.Array.GetRandom(avail) : "brown");
  }

  // Compute left/right patrol bounds using platform center/width and a small margin
  _initPatrolBounds() {
    const m = 12;
    this.leftBound  = this.homePlatform.x - this.homePlatform.displayWidth / 2 + m;
    this.rightBound = this.homePlatform.x + this.homePlatform.displayWidth / 2 - m;
  }

  // Called every frame by Phaser; reverses direction when reaching patrol bounds
  preUpdate(t, d) {
    super.preUpdate(t, d);

    // If we were deactivated by a stomp, do nothing
    if (!this.active) return;

    // If our platform is gone or invalid, skip patrol logic
    if (!this.homePlatform || !this.homePlatform.active) return;

    if (this.x <= this.leftBound)  this.setVelocityX(Math.abs(this.speed));
    if (this.x >= this.rightBound) this.setVelocityX(-Math.abs(this.speed));
  }


  // Handle player contact: stomp from above kills; otherwise deals damage
   onPlayerCollide(player) {
    // If already “dying”, ignore further hits to prevent double-handling
    if (this._dying) return;

    if (this._isStomp(player)) {
      this._dying = true;

      // Give the player a little bounce up so they separate cleanly
      if (player?.body) player.setVelocityY(-220);

      // Immediately make this enemy non-interactive to avoid more overlaps
      if (this.body) {
        this.body.checkCollision.none = true;
        this.body.enable = false; // stop further physics updates
      }
      this.setActive(false).setVisible(false); // stop preUpdate & render
      this.setTint(0x888888); // quick visual cue (optional)

      // Destroy after a short delay
      this.scene.time.delayedCall(500, () => {
        // Guard: only destroy if not already destroyed
        if (!this.scene || this.destroyed) return;
        this.destroy();
      });

      return;
    }

    // Not a stomp → damage the player
    player?.takeDamage?.();
  }


  // Heuristic: if player is moving downward and above our top quarter => treat as stomp
    _isStomp(player) {
    // Guard against null/undefined player or missing physics body
    if (!player || !player.body) return false;

    // Falling downward? (Arcade Physics: +Y = downward)
    const vy = player.body.velocity?.y ?? 0;

    // Player must be above our top quarter and moving down
    return vy > 0 && player.y < this.y - this.displayHeight * 0.25;
  }

}
