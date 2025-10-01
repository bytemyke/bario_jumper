// src/sprites/enemies/BigShell.js
import Phaser from "phaser";

/**
 * BigShell enemy (3x1 spritesheet; frames 0–1 walk, frame 2 shell).
 * - Walks on a platform; turns at patrol bounds
 * - Plays a 2-frame walk animation while moving
 * - On stomp: enters "shell" (falls) and shows frame 2
 */
export default class BigShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "bigShell";
  static FACES_RIGHT = false; // set true if art faces RIGHT by default

  constructor(scene, platform, x = platform.x, color = null) {
    const key = BigShell._chooseKey(scene, color);

    const y = platform.y - platform.displayHeight / 2 - 8;
    super(scene, x, y, key, 0);

    scene.add.existing(this);
    this.setDepth(10);
    this.setOrigin(0.5, 1); // feet baseline

    // Ensure frame 0 initially
    const tex = scene.textures.get(this.texture?.key);
    if (tex && tex.frameTotal > 1) this.setFrame(0);

    // Physics & groups
    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    this._groundCollider = scene.physics.add.collider(this, scene.platforms);

    // Body sizing/offset
    const bodyW = Math.round(this.displayWidth * 0.90);
    const bodyH = Math.round(this.displayHeight * 0.80);
    if (this.body && this.body.setSize) {
      this.body.setSize(bodyW, bodyH);
      const FOOT_BASELINE = 4;
      const baseline = FOOT_BASELINE * this.scaleY;
      const offX = (this.displayWidth - bodyW) / 2;
      const offY = (this.displayHeight - bodyH) - baseline;
      this.body.setOffset(offX, offY);
      this.body.allowGravity = false;
      this.body.bounce.set(0);
    }

    // Identity/meta
    this.type = BigShell.TYPE;
    this.textureKey = key;

    // Patrol setup
    this.homePlatform = platform;
    this.speed = 42;
    this.mode = "walk";
    this._modeCooldown = false;
    this.hazardous = true;
    this._computePatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);

    // Ensure we have a walk animation for this spritesheet (frames 0–1)
    this._ensureWalkAnim();

    // Initial direction + facing + start anim if moving
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
    // Fallbacks if specific texture missing
    candidates.push("spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red");
    candidates.push("basic_3");
    for (const k of candidates) if (scene.textures.exists(k)) return k;
    return "basic_3";
  }

  _ensureWalkAnim() {
    // Animation key is namespaced by texture so multiple color variants can coexist.
    this.walkAnimKey = `${this.texture.key}_walk`;
    if (!this.scene.anims.exists(this.walkAnimKey)) {
      const tex = this.scene.textures.get(this.texture.key);
      // Only make the anim if we truly have at least 2 frames to cycle
      if (tex && tex.frameTotal >= 2) {
        this.scene.anims.create({
          key: this.walkAnimKey,
          frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 0, end: 1 }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
  }

  _computePatrolBounds() {
    const platHalf  = this.homePlatform.displayWidth / 2;
    const shellHalf = this.displayWidth / 2;
    const margin = 2;
    this.leftBound  = this.homePlatform.x - platHalf + shellHalf + margin;
    this.rightBound = this.homePlatform.x + platHalf - shellHalf - margin;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.homePlatform || !this.homePlatform.active) return;

    if (this.mode === "walk") {
      if (this.x <= this.leftBound)  this._setDir(+1);
      if (this.x >= this.rightBound) this._setDir(-1);

      // Keep feet glued to platform top
      this._snapSpriteToPlatform(this.homePlatform);
      if (this.body) this.body.allowGravity = false;

      // Animate only while moving horizontally
      const moving = Math.abs(this.body?.velocity?.x || 0) > 1;
      if (moving && this.walkAnimKey && this.scene.anims.exists(this.walkAnimKey)) {
        if (this.anims.currentAnim?.key !== this.walkAnimKey) this.anims.play(this.walkAnimKey, true);
      } else {
        // Idle on frame 0 when stopped
        if (this.anims.currentAnim) this.anims.stop();
        this.setFrame(0);
      }
    } else if (this.mode === "shell") {
      // Let it fall; auto-despawn off-screen
      const cam = this.scene.cameras.main;
      const bottom = cam.worldView.y + cam.worldView.height;
      if (this.y > bottom + 64) this.destroy();
    }
  }

  onPlayerCollide(player) {
    if (!this.active || !this.body || !player?.body) return;

    if (this.mode === "walk" && this.hazardous) {
      if (this._isStomp(player)) {
        this.scene.score += 20;
        this._enterShell(player);
        return;
      }
      player.takeDamage?.();
      player.setVelocityY(-160);
      return;
    }

    if (this.mode === "shell") {
      if (this._isStomp(player)) {
        player.setVelocityY(-240);
        const vy = this.body.velocity?.y ?? 0;
        this.body.allowGravity = true;
        this.body.setVelocityY(Math.max(vy, 420));
      }
      return;
    }
  }

  _isStomp(player) {
    if (!player || !player.body || !this.body) return false;
    const vy = player.body.velocity?.y ?? 0;   // +Y is downward
    const playerBottom = player.body.bottom;
    const shellTop = this.body.top;
    return vy > 0 && playerBottom <= shellTop + 6;
  }

  _enterShell(player) {
    if (this.mode !== "walk" || this._modeCooldown) return;
    this._modeCooldown = true;

    // Stop any walk animation and switch to shell frame (index 2)
    if (this.anims.currentAnim) this.anims.stop();
    const tex = this.scene.textures.get(this.texture.key);
    if (tex && tex.frameTotal >= 3) this.setFrame(2);
    this.clearTint();

    this.hazardous = false;

    // Disable standing on platforms; keep collidable with player
    if (this._groundCollider) this._groundCollider.active = false;
    if (this.body) {
      this.body.allowGravity = true;
      this.body.setVelocityX(0);
      this.body.checkCollision.none = false;
    }

    this.mode = "shell";
    // IMPORTANT: do NOT call _setDir(0) here; it would reset to frame 0 and show the head.

    if (player?.body) player.setVelocityY(-220);

    this._modeCooldown = false;
  }

  _setDir(dir) {
    this._dir = dir;

    const canMove = (this.mode == null || this.mode === "walk");
    if (dir === 0 || !canMove) {
      this.setVelocityX(0);
    } else {
      const speed = this.speed ?? 42;
      this.setVelocityX(speed * dir);
    }

    // Update facing immediately based on art’s default
    const facesRight = (this.constructor.FACES_RIGHT !== false);
    if (dir !== 0) {
      const flip = (dir > 0) ? !facesRight : facesRight;
      this.setFlipX(flip);
    }

    // Only manage frames/animation while in WALK mode.
    if (this.mode === "walk") {
      if (dir !== 0 && this.walkAnimKey && this.scene.anims.exists(this.walkAnimKey)) {
        this.anims.play(this.walkAnimKey, true);
      } else {
        if (this.anims.currentAnim) this.anims.stop();
        this.setFrame(0);
      }
    }
  }

  _snapSpriteToPlatform(platform) {
    // Safe feet placement (no “sinking”)
    const platformTop = platform.y - platform.displayHeight / 2;
    this.y = platformTop;
  }
}