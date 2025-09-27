// src/sprites/enemies/BigShell.js
import Phaser from "phaser";

/**
 * BigShell enemy (3x1 spritesheet; frame 0 for idle).
 * - Spawns fully ABOVE the platform (origin bottom for precise placement)
 * - Patrols on host platform; turns at bounds
 * - On stomp: becomes "shell" (falls through platforms) but still hurts player on contact
 */
export default class BigShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "bigShell";
  static FACES_RIGHT = false; // set to true if art faces RIGHT by default

  constructor(scene, platform, x = platform.x, color = null) {
    const key = BigShell._chooseKey(scene, color);

    const y = platform.y - platform.displayHeight / 2 - 8;
    super(scene, x, y, key, 0);

    scene.add.existing(this);
    this.setDepth(10);

    // Use bottom origin so sprite.y is the FEET baseline
    this.setOrigin(0.5, 1);

    // Force frame 0 if sheet has multiple frames
    {
      const tex = scene.textures.get(this.texture.key);
      if (tex && tex.frameTotal > 1) this.setFrame(0);
    }

    // Physics
    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    this._groundCollider = scene.physics.add.collider(this, scene.platforms);

    // Body sizing
    const bodyW = Math.round(this.displayWidth * 0.9);
    const bodyH = Math.round(this.displayHeight * 0.8);
    if (this.body && this.body.setSize) {
      this.body.setSize(bodyW, bodyH);
      const FOOT_BASELINE = 4;
      const baseline = FOOT_BASELINE * this.scaleY;
      const offX = (this.displayWidth - bodyW) / 2;
      const offY = this.displayHeight - bodyH - baseline;
      this.body.setOffset(offX, offY);
      this.body.allowGravity = false;
      this.body.bounce.set(0);
    }

    // FIX: define a safe gap before snapping (prevents NaN y)
    this._GAP = 0;
    this._snapSpriteToPlatform(platform);

    // Identity/meta
    this.type = BigShell.TYPE;
    this.textureKey = key;

    // Patrol setup
    this.homePlatform = platform;
    this.speed = 42;
    this.mode = "walk";
    this._modeCooldown = false;
    this.hazardous = true; // for "walk" mode
    this._computePatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);

    // Initial direction + facing
    this._setDir(Math.random() < 0.5 ? -1 : 1);
  }

  static _chooseKey(scene, color) {
    const variants = (base) => [
      base,
      base.replace("bigShell_", "big_Shell_"),
      base.replace("bigShell", "BigShell"),
      base.replace("bigShell", "big_shell"),
    ];
    const candidates = [];
    candidates.push(...variants("bigShell_red"));
    candidates.push(
      "spikeyShell_yellow",
      "spikeyShell_blue",
      "spikeyShell_red"
    );
    candidates.push("basic_3");
    for (const k of candidates) if (scene.textures.exists(k)) return k;
    return "basic_3";
  }

  _computePatrolBounds() {
    const platHalf = this.homePlatform.displayWidth / 2;
    const shellHalf = this.displayWidth / 2;
    const margin = 2;
    this.leftBound = this.homePlatform.x - platHalf + shellHalf + margin;
    this.rightBound = this.homePlatform.x + platHalf - shellHalf - margin;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.homePlatform || !this.homePlatform.active) return;

    if (this.mode === "walk") {
      if (this.x <= this.leftBound) this._setDir(+1);
      if (this.x >= this.rightBound) this._setDir(-1);
      this._snapSpriteToPlatform(this.homePlatform);
      if (this.body) this.body.allowGravity = false;
    } else if (this.mode === "shell") {
      const cam = this.scene.cameras.main;
      const bottom = cam.worldView.y + cam.worldView.height;
      if (this.y > bottom + 64) this.destroy();
    }
  }

  onPlayerCollide(player) {
    if (!this.active || !this.body || !player?.body) return;

    if (this.mode === "walk" && this.hazardous) {
      // WALK: stomp converts to shell, else damage
      if (this._isStomp(player)) {
        this.scene.score += 25;
        this._enterShell(player);
        return;
      }
      player.takeDamage?.();
      player.setVelocityY(-160);
      return;
    }

    if (this.mode === "shell") {
      // SHELL: do NOT hurt the player anymore
      if (this._isStomp(player)) {
        // Bounce player up a bit
        player.setVelocityY(-240);

        // Ensure shell is moving downward (no pass-through toggles)
        const vy = this.body.velocity?.y ?? 0;
        this.body.allowGravity = true;
        this.body.setVelocityY(Math.max(vy, 420));

        // keep colliding; just return
        return;
      }

      // Side/bottom contact in shell: still no damage
      return;
    }
  }

  _isStomp(player) {
    if (!player || !player.body || !this.body) return false;
    const vy = player.body.velocity?.y ?? 0; // +Y is downward
    const playerBottom = player.body.bottom;
    const shellTop = this.body.top;
    return vy > 0 && playerBottom <= shellTop + 6;
  }

  _enterShell(player) {
    if (this.mode !== "walk" || this._modeCooldown) return;
    this._modeCooldown = true;

    const tex = this.scene.textures.get(this.texture.key);
    if (tex && tex.frameTotal >= 3) this.setFrame(2);
    this.clearTint();

    // Walking hazard off; shell contact handled in onPlayerCollide
    this.hazardous = false;

    // Let it FALL: disable platform collider, but keep body collidable with PLAYER
    if (this._groundCollider) this._groundCollider.active = false;
    if (this.body) {
      this.body.allowGravity = true;
      this.body.setVelocityX(0);
      this.body.checkCollision.none = false; // keep colliding with player
    }

    this.mode = "shell";
    this._setDir(0);

    if (player?.body) player.setVelocityY(-220);

    this._modeCooldown = false;
  }

  _setDir(dir) {
    this._dir = dir;

    const canMove = this.mode == null || this.mode === "walk";
    if (dir === 0 || !canMove) {
      this.setVelocityX(0);
    } else {
      const speed = this.speed ?? 42;
      this.setVelocityX(speed * dir);
    }

    const facesRight = this.constructor.FACES_RIGHT !== false;
    if (dir !== 0) {
      const flip = dir > 0 ? !facesRight : facesRight;
      this.setFlipX(flip);
    }
  }

  _snapSpriteToPlatform(platform) {
    const platformTop = platform.y - platform.displayHeight / 2;
    this.y = platformTop - this._GAP;
  }
}
