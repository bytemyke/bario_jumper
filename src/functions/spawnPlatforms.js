// src/functions/spawnPlatforms.js
import Phaser from "phaser";
import Platform from "../sprites/Platform";

/* ---------------- Tunables (difficulty & density) ---------------- */

// Global hard cap on total platforms alive
const PLATFORM_POOL_CAP = 15;

// Max platforms allowed in the camera view at once
const MAX_IN_VIEW = 12;

// Vertical placement band relative to jump height
const GAP_MIN_FRAC = 0.35; // lower edge (closer to player; easier to reach)
const GAP_MAX_FRAC = 0.85; // upper edge (higher above player)

// Horizontal reach safety margin (0..1)
const SAFETY = 0.85;

// Keep off the extreme edges
const X_PADDING = 40;

// Attempts when sampling a valid position in the band
const MAX_TRIES = 40;  // was 28 — give sampling more room

// --- SPACING RULES ---
// Base spacing; now slightly looser to restore density
const H_SPACING_MULT = 1.2;         // X: ≥ 1.2 × wider platform width
const V_SPACING_PLAYER_MULT = 2.4;  // Y: ≥ 2.4 × player height

// If placement is hard, gradually relax spacing (never below RELAX_MIN)
const RELAX_START_TRY = 24; // after this many tries, begin relaxing spacing
const RELAX_STEP = 0.05;    // 5% looser each attempt past RELAX_START_TRY
const RELAX_MIN = 0.80;     // never relax below 80% of the base gaps

/* ---------------- Public API ---------------- */

/**
 * Wire landing-driven spawning. Room starts empty; nothing is placed until first landing.
 * Call once in GameScene.create(...)
 */
export function initializePlatforms(scene, player) {
  scene.platforms = scene.physics.add.staticGroup();

  // Airborne -> grounded transition detector
  scene._prevGrounded = false;
  scene._pendingLandedPlatform = null;

  // NEW: gating + seed flag
  scene._initialLandingDone = false; // flip true after first real landing
  scene._hasLeftGround = false;      // becomes true once we were actually airborne
  scene._seeded = false;             // NEW: have we done the first full-screen seed yet?

  // Remember which platform we touched (physics collider)
  scene.physics.add.collider(player, scene.platforms, (plr, plat) => {
    scene._pendingLandedPlatform = plat || null;
  });

  scene.events.on("postupdate", () => {
    const b = player?.body;
    if (!b) return;

    const grounded = b.blocked.down || b.touching.down;
    const fallingOrRest = b.velocity.y >= 0;

    if (!grounded) scene._hasLeftGround = true;

    // Only start spawning after the first real fall -> landing cycle
    if (fallingOrRest && grounded && !scene._prevGrounded) {
      if (!scene._initialLandingDone) {
        if (scene._hasLeftGround) {
          scene._initialLandingDone = true;
          spawnPlatforms(scene, player, scene._pendingLandedPlatform);
          scene._pendingLandedPlatform = null;
        }
      } else {
        spawnPlatforms(scene, player, scene._pendingLandedPlatform);
        scene._pendingLandedPlatform = null;
      }
    }

    scene._prevGrounded = grounded;
  });
}

/**
 * Called on each true landing.
 * First landing: seed a full, reachable ladder across the whole screen height.
 * Thereafter: only despawn when off the bottom, and spawn **one** new platform at the top if any were culled.
 */
export function spawnPlatforms(scene, player, landedPlatform = null) {
  // Hard gate in case anything calls this early
  if (!scene._initialLandingDone) return;

  const h = maxJumpHeight(scene, player);
  const reach = horizontalReach(scene, player);

  const camTop = scene.cameras.main.scrollY;
  const camBot = camTop + scene.scale.height;

  const bandTop = player.y - GAP_MAX_FRAC * h;
  const bandBot = player.y - GAP_MIN_FRAC * h;

  /* ---- 1) Cull only when truly below the screen ---- */
  const killY = camBot + 4; // tiny buffer below the view
  let culled = 0;
  scene.platforms.children.iterate(p => {
    if (p && p.y > killY) { p.destroy(); culled++; }
  });

  // (Re-snapshot if you need counts)
  const totalNow = countPlatforms(scene);

  /* ---- 2) First landing: seed a full ladder top-to-bottom (reachable chain) ---- */
  if (!scene._seeded) { // NEW
    seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot);
    scene._seeded = true;
    return; // next landing will use the incremental top spawn
  }

  /* ---- 3) After seeding: if anything fell off the bottom, add exactly one at the top ---- */
  if (culled > 0 && totalNow < PLATFORM_POOL_CAP && currentInView(scene, camTop, camBot) < MAX_IN_VIEW) {
    spawnOneAtTop(scene, player, h, reach, camTop);
  }

  /* ---- 4) Optional recycle: if we landed on the lowest in-band, nudge it up within band (unchanged) ---- */
  const keep = [];
  scene.platforms.children.iterate(p => {
    if (!p) return;
    const inBand = p.y < player.y && p.y >= bandTop && p.y <= bandBot;
    const inReach = Math.abs(p.x - player.x) <= reach;
    if (inBand && inReach) keep.push(p);
    // CHANGED: do NOT delete “way-above” anymore; we keep everything until it leaves bottom
  });

  if (landedPlatform && keep.length > 0) {
    const lowest = keep.slice().sort((a, b) => b.y - a.y)[0];
    if (landedPlatform === lowest) {
      placeReachableInBand(scene, landedPlatform, player, h, reach, /*prefer=*/"balanced");
      landedPlatform.refreshBody?.();
    }
  }

  // CHANGED: do NOT trim in-view density; we rely on off-bottom cull + top spawn to keep flow
  // trimInView(scene, camTop, camBot, MAX_IN_VIEW, player);  // removed
}

/* ---------------- Seeding & Top-layer helpers (NEW) ---------------- */

/** Seed a full, reachable ladder from near the bottom of the band up to (almost) the top of the screen. */
function seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot) {
  const minGap = GAP_MIN_FRAC * h;
  const maxGap = GAP_MAX_FRAC * h;
  const topLimit = camTop + 12; // slight inset from very top

  // 1) First platform: near the bottom of the player's reachable band (easy first step)
  const firstY = Phaser.Math.Linear(bandTop, bandBot, 0.90);
  const firstXMin = Math.max(X_PADDING, player.x - reach * 0.6);
  const firstXMax = Math.min(scene.scale.width - X_PADDING, player.x + reach * 0.6);

  const p1 = new Platform(scene, 0, 0);
  let placedFirst = false;
  for (let i = 0; i < MAX_TRIES; i++) {
    const x = Phaser.Math.FloatBetween(firstXMin, firstXMax);
    if (placeAt(scene, p1, x, firstY, player, h, reach)) { placedFirst = true; break; }
  }
  if (!placedFirst) { p1.destroy(); return; }
  p1.refreshBody?.();

  // 2) Climb upward, placing rungs at valid gaps until we touch the top limit or hit caps
  let prev = p1;
  let safetyCounter = 0;

  while (
    prev.y - maxGap > topLimit &&                      // still room for at least a max-gap step
    currentInView(scene, camTop, camBot) < MAX_IN_VIEW &&
    countPlatforms(scene) < PLATFORM_POOL_CAP &&
    safetyCounter++ < 100
  ) {
    const next = new Platform(scene, 0, 0);
    const gap = Phaser.Math.FloatBetween(minGap, maxGap);
    let y = Math.max(topLimit, prev.y - gap);

    // sample x within horizontal reach of the previous rung
    const minX = Math.max(X_PADDING, prev.x - reach);
    const maxX = Math.min(scene.scale.width - X_PADDING, prev.x + reach);

    let ok = false;
    for (let t = 1; t <= MAX_TRIES; t++) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      // Ensure step is reachable from the previous rung (not necessarily from the player directly)
      const dy = prev.y - y;
      const dx = Math.abs(x - prev.x);
      if (dy < minGap || dy > maxGap || dx > reach) continue;

      const relax = relaxFactorForTry(Math.max(RELAX_START_TRY, t));
      if (!canPlaceWithSpacing(scene, x, y, next, player, relax)) continue;

      next.setPosition(x, y);
      ok = true;
      break;
    }

    if (ok) {
      next.refreshBody?.();
      prev = next;
    } else {
      next.destroy();
      break; // stop seeding if we can't fit another valid rung
    }
  }

  // Optional: try to snap a final rung exactly at topLimit if we didn't land close enough
  if (
    prev.y - minGap > topLimit &&                       // still room for a minimal step
    currentInView(scene, camTop, camBot) < MAX_IN_VIEW &&
    countPlatforms(scene) < PLATFORM_POOL_CAP
  ) {
    const last = new Platform(scene, 0, 0);
    const y = topLimit;
    const minX = Math.max(X_PADDING, prev.x - reach);
    const maxX = Math.min(scene.scale.width - X_PADDING, prev.x + reach);

    let ok = false;
    for (let t = 1; t <= MAX_TRIES; t++) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      const dy = prev.y - y, dx = Math.abs(x - prev.x);
      if (dy < minGap || dy > maxGap || dx > reach) continue;

      if (!canPlaceWithSpacing(scene, x, y, last, player, 1.0)) continue;
      last.setPosition(x, y);
      ok = true;
      break;
    }
    if (ok) last.refreshBody?.(); else last.destroy();
  }
}

/** Spawn exactly one platform near the top, spaced and reachable from the current top-most rung. */
function spawnOneAtTop(scene, player, h, reach, camTop) {
  const minGap = GAP_MIN_FRAC * h;
  const maxGap = GAP_MAX_FRAC * h;
  const topLimit = camTop + 12;

  // Find the current top-most (smallest y) platform
  const children = scene.platforms.getChildren().filter(Boolean);
  if (children.length === 0) return;

  const topMost = children.slice().sort((a, b) => a.y - b.y)[0];
  // We want a gap in [minGap, maxGap] from topMost, ideally landing at (or near) topLimit
  const gapTarget = Phaser.Math.Clamp(topMost.y - topLimit, minGap, maxGap);
  const y = topMost.y - gapTarget;

  const p = new Platform(scene, 0, 0);
  const minX = Math.max(X_PADDING, topMost.x - reach);
  const maxX = Math.min(scene.scale.width - X_PADDING, topMost.x + reach);

  for (let t = 1; t <= MAX_TRIES; t++) {
    const x = Phaser.Math.FloatBetween(minX, maxX);
    const dy = topMost.y - y, dx = Math.abs(x - topMost.x);
    if (dy < minGap || dy > maxGap || dx > reach) continue;

    const relax = relaxFactorForTry(Math.max(RELAX_START_TRY, t));
    if (!canPlaceWithSpacing(scene, x, y, p, player, relax)) continue;

    p.setPosition(x, y);
    p.refreshBody?.();
    return;
  }
  p.destroy();
}

/* ---------------- Existing helpers (unchanged) ---------------- */

function countPlatforms(scene) {
  return scene.platforms.getChildren().filter(Boolean).length;
}

function currentInView(scene, camTop, camBot) {
  return scene.platforms.getChildren().filter(p => p && p.y >= camTop && p.y <= camBot).length;
}

/**
 * Place a platform somewhere reachable within the band, respecting spacing rules
 * against **all existing platforms**. If sampling gets hard, we gradually relax spacing.
 * prefer: "top" | "bottom" | "balanced" (bias where we sample Y)
 */
function placeReachableInBand(scene, platform, player, h, reach, prefer="balanced") {
  const w = scene.scale.width;
  const bandTop = player.y - GAP_MAX_FRAC * h;
  const bandBot = player.y - GAP_MIN_FRAC * h;

  let tries = 0;
  while (tries++ < MAX_TRIES) {
    let y;
    const r = Phaser.Math.FloatBetween(0, 1);
    if (prefer === "top") {
      const t = Math.pow(r, 2);
      y = Phaser.Math.Linear(bandTop, bandBot, t);
    } else if (prefer === "bottom") {
      const t = 1 - Math.pow(r, 2);
      y = Phaser.Math.Linear(bandTop, bandBot, t);
    } else {
      y = Phaser.Math.FloatBetween(bandTop, bandBot);
    }
    if (y >= player.y) continue; // must be above the player

    const minX = Math.max(X_PADDING, player.x - reach);
    const maxX = Math.min(w - X_PADDING, player.x + reach);
    const x = Phaser.Math.FloatBetween(minX, maxX);

    if (!canReach(player.x, player.y, x, y, h, reach)) continue;

    const relax = relaxFactorForTry(tries);
    if (!canPlaceWithSpacing(scene, x, y, platform, player, relax)) continue;

    platform.setPosition(x, y);
    return true;
  }
  return false;
}

/** Direct placement at (x,y) if it respects spacing against **all** platforms */
function placeAt(scene, platform, x, y, player, h, reach) {
  if (y >= player.y) return false;
  if (!canReach(player.x, player.y, x, y, h, reach)) return false;

  // Try strict first, then relaxed if needed
  for (let t = 1; t <= 1 + (MAX_TRIES - RELAX_START_TRY); t++) {
    const relax = relaxFactorForTry(Math.min(MAX_TRIES, RELAX_START_TRY + (t - 1)));
    if (canPlaceWithSpacing(scene, x, y, platform, player, relax)) {
      platform.setPosition(x, y);
      return true;
    }
  }
  return false;
}

/**
 * Smarter spacing:
 *  - Reject only if the candidate is too close in BOTH axes.
 *  - Use `relax` to slightly loosen gaps when sampling struggles.
 */
function canPlaceWithSpacing(scene, x, y, platform, player, relax = 1.0) {
  const minYGap = Math.max(1, V_SPACING_PLAYER_MULT * relax * getPlayerHeight(player));
  const widthSelf = getPlatformWidth(platform);

  for (const peer of scene.platforms.getChildren()) {
    if (!peer || peer === platform) continue;

    const dx = Math.abs(x - peer.x);
    const dy = Math.abs(y - peer.y);

    const minXGap = Math.max(1, H_SPACING_MULT * relax * Math.max(widthSelf, getPlatformWidth(peer)));

    // If it's close on X AND close on Y, reject (prevents stacking/overlap box).
    if (dx < minXGap && dy < minYGap) return false;
  }
  return true;
}

function relaxFactorForTry(tryIndex) {
  if (tryIndex < RELAX_START_TRY) return 1.0;
  const steps = tryIndex - RELAX_START_TRY + 1;
  const factor = 1.0 - steps * RELAX_STEP;
  return Math.max(RELAX_MIN, factor);
}

function getPlatformWidth(p) {
  if (p.displayWidth) return p.displayWidth;
  if (p.body?.width) return p.body.width;
  const tex = p.scene?.textures?.get(p.texture?.key || "castle_platform");
  const src = tex && tex.getSourceImage ? tex.getSourceImage() : null;
  return (src && src.width) ? src.width : 64; // fallback
}

function getPlayerHeight(player) {
  if (player.displayHeight) return player.displayHeight;
  if (player.body?.height) return player.body.height;
  return 32; // fallback
}

function maxJumpHeight(scene, player) {
  const g = Math.max(1, scene.physics.world.gravity.y);
  const v = Math.abs(player.jumpSpeed ?? -500);
  return (v * v) / (2 * g);
}

function horizontalReach(scene, player) {
  const g = Math.max(1, scene.physics.world.gravity.y);
  const v = Math.abs(player.jumpSpeed ?? -500);
  const airtime = (2 * v) / g;     // up + down time
  const speed = player.moveSpeed ?? 200;
  return Math.floor(speed * airtime * SAFETY);
}

function canReach(x0, y0, x1, y1, maxH, reach) {
  const dy = y0 - y1;
  const dx = Math.abs(x1 - x0);
  return dy > 0 && dy <= maxH && dx <= reach;
}

function distance(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  return Math.hypot(dx, dy);
}
