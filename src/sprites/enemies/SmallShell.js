// src/sprites/enemies/SmallShell.js
import Phaser from "phaser";

/**
 * SmallShell enemy (3x1 spritesheet; frames 0–1 walk, frame 2 shell).
 * Modes:
 *  - "walk": patrol; stomp → enter "shell"
 *  - "shell": non-hazard; any contact from player knocks it off the platform
 *
 * Notes:
 *  - We STOP any active animation and set frame 2 on shell entry.
 *  - We DO NOT call _setDir(0) on shell entry (prevents overwriting frame 2).
 *  - _setDir() only manages frames/anims when mode === "walk".
 */
export default class SmallShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "smallShell";
  static FACES_RIGHT = false; // set to true if art faces RIGHT by default

  constructor(scene, platform, x = platform.x, color = null) {
    const key = SmallShell._chooseKey(scene, color);

    // Place on top of platform
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
    this.type = SmallShell.TYPE;
    this.textureKey = key;

    // Patrol setup
    this.homePlatform = platform;
    this.speed = 52; // a bit quicker than BigShell
    this.mode = "walk";
    this._modeCooldown = false;
    this.hazardous = true; // only hazardous in walk mode
    this._computePatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);

    // Ensure we have a walk animation (frames 0–1)
    this._ensureWalkAnim();

    // Initial direction + facing + start anim if moving
    this._setDir(Math.random() < 0.5 ? -1 : 1);
  }

  // Pick a texture key with some flexible fallbacks
  static _chooseKey(scene, color) {
    const variants = (base) => [
      base,
      base.replace("smallShell_", "small_Shell_"),
      base.replace("smallShell", "SmallShell"),
      base.replace("smallShell", "small_shell"),
    ];

    const want = [];
    const allowed = ["blue", "darkGrey", "darkgray", "dark_grey", "darkgrey"];
    if (color && allowed.includes(String(color))) {
      want.push(...variants(`smallShell_${color}`));
    } else {
      want.push(...variants("smallShell_blue"));
      want.push(...variants("smallShell_darkGrey"));
    }

    // extra fallbacks if specific texture missing
    want.push("spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red");
    want.push("basic_3");

    for (const k of want) {
      if (scene.textures.exists(k)) return k;
    }
    return "basic_3";
  }

  _ensureWalkAnim() {
    // Animation key is namespaced by texture so multiple color variants can coexist.
    this.walkAnimKey = `${this.texture.key}_walk`;
    if (!this.scene.anims.exists(this.walkAnimKey)) {
      const tex = this.scene.textures.get(this.texture.key);
      // Only make the anim if we truly have at least 2 frames (0–1)
      if (tex && tex.frameTotal >= 2) {
        this.scene.anims.create({
          key: this.walkAnimKey,
          frames: this.scene.anims.generateFrameNumbers(this.texture.key, { start: 0, end: 1 }),
          frameRate: 10,
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
        this._enterShell(player);
        return;
      }
      // Damage player if they run into the walking shell
      player.takeDamage?.();
      // small bounce reaction
      player.setVelocityY(-160);
      return;
    }

    if (this.mode === "shell") {
      // Any contact in shell mode "knocks it off" the platform:
      // - make sure gravity is on
      // - disable ground collider so it slips/falls
      // - push it away slightly from the player horizontally and/or down
      this._knockOffFrom(player);
      // Give the player a satisfying bounce upward on top-stomp
      if (this._isStomp(player)) {
        player.setVelocityY(-240);
      }
      return;
    }
  }

  _isStomp(player) {
    if (!player || !player.body || !this.body) return false;
    const vy = player.body.velocity?.y ?? 0;   // +Y is downward
    const playerBottom = player.body.bottom;
    const shellTop = this.body.top;
    // Coming down and contacting near the top of the shell
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
    // IMPORTANT: do NOT call _setDir(0) here; it would reset to frame 0.

    // Bounce the player a bit for feedback
    if (player?.body) player.setVelocityY(-220);

    this._modeCooldown = false;
  }

  _knockOffFrom(player) {
    if (!this.body) return;
    // Ensure gravity and disable platform collider so it can fall off
    this.body.allowGravity = true;
    if (this._groundCollider) this._groundCollider.active = false;

    // Determine push direction away from player
    const dx = Math.sign(this.x - player.x) || (Math.random() < 0.5 ? 1 : -1);
    const pushX = 80 * dx;  // gentle horizontal nudge
    const pushY = Math.max(this.body.velocity?.y ?? 0, 220); // ensure it heads downward

    this.body.setVelocity(pushX, pushY);

    // Keep showing shell frame
    const tex = this.scene.textures.get(this.texture.key);
    if (tex && tex.frameTotal >= 3) this.setFrame(2);
  }

  _setDir(dir) {
    this._dir = dir;

    const canMove = (this.mode == null || this.mode === "walk");
    if (dir === 0 || !canMove) {
      this.setVelocityX(0);
    } else {
      const speed = this.speed ?? 52;
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
