// src/sprites/enemies/Ghost.js
import Phaser from "phaser";

export default class Ghost extends Phaser.Physics.Arcade.Sprite {
  static TYPE = "ghost";

  constructor(scene, x, y) {
    super(scene, x, y, "ghost", 0);

    // 1) add to display list + physics world BEFORE touching body/anim/group
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // --- defensive global cap (counts existing ghosts BEFORE adding this one) ---
    const ghostCount =
      (scene.enemies?.getChildren?.() || []).filter(
        (e) => e?.constructor?.TYPE === "ghost" && e.active
      ).length;
    if (ghostCount >= 2) {
      this.destroy();
      return;
    }

    // 2) basic setup now that we have a physics body
    this.setOrigin(0.5, 0.5);
    this.setImmovable(true);
    this.body.allowGravity = false;
    this.setDepth(20);
    this.setActive(true);
    this.setVisible(true);

    // 3) movement + range gate
    this.speed = 45;              // try 60–80 later if you want them scarier
    this.freezeEpsilon = 4;
    this.maxPlatformGapToChase = 5;   // only chase if ≤ 5 platforms apart
    this._withinRange = true;
    this._rangeCheckCooldownMs = 0;   // updated ~every 200ms

    // 4) ensure (global) float animation exists, then play it
    this._ensureFloatAnim(scene);
    this.play("ghost_float", true);

    // 5) finally join the enemies group so the scene collider sees us
    if (scene.enemies && !scene.enemies.contains(this)) {
      scene.enemies.add(this);
    }
  }

  _ensureFloatAnim(scene) {
    const key = "ghost_float";
    // AnimationManager is on scene.anims
    if (scene.anims.exists(key)) return;

    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers("ghost", { start: 0, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  _playerIsFacingMe(player) {
    if (!player?.active) return false;
    const dx = this.x - player.x;
    if (player.flipX && dx < -this.freezeEpsilon) return true;  // facing left, ghost left
    if (!player.flipX && dx > this.freezeEpsilon) return true;  // facing right, ghost right
    return false;
  }

  // Count how many active platforms have a Y between player and ghost
  _platformsBetweenUs(scene, player) {
    const plats = scene.platforms?.getChildren?.() || [];
    const yMin = Math.min(this.y, player.y);
    const yMax = Math.max(this.y, player.y);
    let count = 0;
    for (const p of plats) {
      if (!p?.active) continue;
      const py = p.y ?? p.body?.y;
      if (py == null) continue;
      if (py > yMin && py < yMax) count++;
    }
    return count;
  }

  preUpdate(t, dt) {
    super.preUpdate(t, dt);
    const scene = this.scene;
    const player = scene?.player;
    if (!player?.active) return;

    // Refresh the "within 5 platforms" flag ~every 200ms to avoid per-frame scans
    this._rangeCheckCooldownMs -= dt;
    if (this._rangeCheckCooldownMs <= 0) {
      const between = this._platformsBetweenUs(scene, player);
      this._withinRange = between <= this.maxPlatformGapToChase;
      this._rangeCheckCooldownMs = 200; // ms
    }

    const lookedAt = this._playerIsFacingMe(player);

    // Final movement logic
    if (lookedAt || !this._withinRange) {
      this.setVelocity(0, 0); // freeze when watched OR out of range
    } else {
      const ang = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
    }

    // cosmetic flip
    this.setFlipX(player.x < this.x);

    // clean-up when far below camera
    const cam = scene.cameras.main;
    if (this.y > cam.worldView.bottom + 160) this.destroy();
  }

  onPlayerCollide(player) {
    if (player?._springActive) return; // allow spring-invuln if you want
    player?.die?.();
  }
}
