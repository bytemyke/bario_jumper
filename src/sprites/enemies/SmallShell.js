// src/sprites/enemies/SmallShell.js
import Phaser from "phaser";

/**
 * SmallShell enemy (3x1 spritesheet; frame 0 for idle).
 * Modes:
 *  - "walk": patrol; stomp → enter "shell"
 *  - "shell": contact hurts player (until future kick logic is added)
 */
export default class SmallShell extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "smallShell";
  static FACES_RIGHT = false;

  constructor(scene, platform, x = platform.x, color = null) {
    const key = SmallShell._chooseKey(scene, color);

    const y = platform.y - platform.displayHeight / 2 - 8;
    super(scene, x, y, key, 0);
    scene.add.existing(this);
    this.setDepth(10);

    {
      const tex = scene.textures.get(this.texture.key);
      if (tex && tex.frameTotal > 1) this.setFrame(0);
    }

    scene.physics.add.existing(this);
    scene.enemies?.add(this);
    scene.physics.add.collider(this, scene.platforms);

    this.type = SmallShell.TYPE;
    this.textureKey = key;

    this.homePlatform = platform;
    this.speed = 58;
    this.mode = "walk";
    this._modeCooldown = false;
    this._initPatrolBounds();

    this.setBounce(0).setCollideWorldBounds(false);
    this._setDir(Math.random() < 0.5 ? -1 : 1);

    if (this.body && this.body.setSize) {
      const fw = this.frame?.realWidth ?? this.width;
      const fh = this.frame?.realHeight ?? this.height;
      this.body.setSize(fw, fh, true);
    }
  }

  static _chooseKey(scene, color) {
    const variants = (base) => [
      base,
      base.replace("smallShell_", "small_Shell_"),
      base.replace("smallShell_", "SmallShell_"),
    ];
    const want = [];
    const allowed = ["blue", "darkGrey"];
    if (color && allowed.includes(color)) {
      want.push(...variants(`smallShell_${color}`));
    } else {
      want.push(...variants("smallShell_blue"));
      want.push(...variants("smallShell_darkGrey"));
    }
    want.push("spikeyShell_yellow", "spikeyShell_blue", "spikeyShell_red");
    want.push("basic_3");
    for (const k of want) if (scene.textures.exists(k)) return k;
    return "basic_3";
  }

  _initPatrolBounds() {
    const margin = 12;
    const half = this.homePlatform.displayWidth / 2;
    this.leftBound  = this.homePlatform.x - half + margin;
    this.rightBound = this.homePlatform.x + half - margin;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.mode !== "walk") return;
    if (!this.homePlatform || !this.homePlatform.active) return;
    if (this.x <= this.leftBound)  this._setDir(+1);
    if (this.x >= this.rightBound) this._setDir(-1);
  }

 onPlayerCollide(player) {
  if (!this.active || !this.body || !player?.body) return;

  if (this.mode === "walk") {
    // WALK: stomp => enter shell; else damage
    if (this._isStomp(player)) {
       this._enterShell(player);
       return;
     }
     player?.takeDamage?.();
     if (player?.body) player.setVelocityY(-160);
     return;
   }

  if (this.mode === "shell") {
    // SHELL: do NOT hurt the player
    if (this._isStomp(player)) {
      // Stomp on a shell => pop it (disappear) and bounce player
      this._popAndDie(player);
    }
    return; // sides/bottom in shell: no damage
  }
}

  _isStomp(player) {
   if (!player?.body || !this?.body) return false;
   const vy = player.body.velocity.y;        // +Y is downward in Arcade
   const bottom = player.body.bottom;
   const top = this.body.top;
   // 1) must be moving downward at all (don’t require huge speed)
   const downward = vy > 40;
   // 2) player’s feet are above our top (with a bit of forgiveness)
   const aboveTop = bottom <= top + 6;
   // 3) decent horizontal overlap (forgive slight grazes)
   const overlapX =
     (player.body.right > this.body.left + 4) &&
     (player.body.left  < this.body.right - 4);
   return downward && aboveTop && overlapX;
 }

  _enterShell(player) {
    if (this.mode !== "walk" || this._modeCooldown) return;
    this._modeCooldown = true;

    this.mode = "shell";
    this._setDir(0);

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
      // Brief i-frames to avoid immediate retrigger, then resume collisions
      this.body.checkCollision.none = true;
      this.scene.time.delayedCall(80, () => {
        if (this.body) this.body.checkCollision.none = false;
        this._modeCooldown = false;
      });
    } else {
      this._modeCooldown = false;
    }
  }

  _setDir(dir) {
    this._dir = dir;
    const canMove = (this.mode == null || this.mode === "walk");
    if (dir === 0 || !canMove) {
      this.setVelocityX(0);
    } else {
      const speed = this.speed ?? 50;
      this.setVelocityX(speed * dir);
    }
    const facesRight = (this.constructor.FACES_RIGHT !== false);
    if (dir !== 0) {
      const flip = (dir > 0) ? !facesRight : facesRight;
      this.setFlipX(flip);
    }
  }
}
