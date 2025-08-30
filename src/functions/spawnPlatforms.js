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
const MAX_TRIES = 40;

// --- SPACING RULES ---
const H_SPACING_MULT = 1.2;        // X: ≥ 1.2 × wider platform width
const V_SPACING_PLAYER_MULT = 2.4; // Y: ≥ 2.4 × player height

// Head-clear to avoid narrow-under-wide vertical traps
const HEAD_CLEAR_FRAC = 0.6; // fraction of upper width for horizontal offset

/* -------- Optional platform policy (minimal extras) -------- */

// Chance to add an optional between two main rungs (kept small)
const OPTIONAL_SPAWN_CHANCE = 0.60; // was 0.35

// Max optional platforms visible at once
const OPTIONAL_MAX_IN_VIEW = 6; // was 3

// Push optional farther from the “center path” (more X)
const OPTIONAL_MIN_AWAY_FRAC = 0.78; // tuned higher earlier

// Also keep some distance from each anchor on X
const OPTIONAL_MIN_X_FROM_ANCHOR_FRAC = 0.48; // tuned higher earlier

// Bias optional Y closer to the LOWER rung so there’s more room to jump up
const OPTIONAL_Y_FRACTION_MIN = 0.30; // 30% of gap up from lower
const OPTIONAL_Y_FRACTION_MAX = 0.45; // 45% of gap up from lower

// Ensure enough vertical room from optional to the upper rung (more Y)
const OPTIONAL_MIN_UP_CLEAR_PLAYER_MULT = 3.0;

// Also ensure clearance to the nearest platform above (not only the upper rung)
const OPTIONAL_MIN_UP_CLEAR_ANY_MULT = 2.6;

/* -------- Off-screen spawn buffers (post-seed only) -------- */
// We prefer to spawn above the camera; if that would break reachability, keep it reachable even if barely visible.
const OFFSCREEN_SPAWN_BUFFER = 64;    // main top rung tries to be >= 64px above camTop
const OPTIONAL_OFFSCREEN_BUFFER = 48; // paired optional tries to be >= 48px above camTop

/* -------- Off-screen headroom built during initial seed -------- */
const SEED_HEADROOM_JUMPS = 3; // how many extra rungs to prebuild above the camera on first seed

/* -------- “Essential corridor” keep-out for optionals -------- */
// Half-width of the no-fly corridor around the straight path between lower and upper essentials.
const ESSENTIAL_CORRIDOR_FRAC = 0.38;   // × horizontal reach
const ESSENTIAL_CORRIDOR_MIN_PX = 22;   // absolute floor in pixels

/* ---------------- Public API ---------------- */

export function initializePlatforms(scene, player) {
  scene.platforms = scene.physics.add.staticGroup();

  scene._prevGrounded = false;
  scene._pendingLandedPlatform = null;

  scene._initialLandingDone = false;
  scene._hasLeftGround = false;
  scene._seeded = false;

  scene.physics.add.collider(player, scene.platforms, (plr, plat) => {
    scene._pendingLandedPlatform = plat || null;
  });

  scene.events.on("postupdate", () => {
    const b = player?.body;
    if (!b) return;

    const grounded = b.blocked.down || b.touching.down;
    const fallingOrRest = b.velocity.y >= 0;

    if (!grounded) scene._hasLeftGround = true;

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
 * First landing: seed a full, reachable ladder across the whole screen height + a small off-screen headroom buffer.
 * Thereafter: only despawn when off the bottom, and spawn **one** new platform at the top if any were culled.
 * Optional platforms may be added *between* rungs (more often now), but never inside the essential corridor.
 */
export function spawnPlatforms(scene, player, landedPlatform = null) {
  if (!scene._initialLandingDone) return;

  const h = maxJumpHeight(scene, player);
  const reach = horizontalReach(scene, player);

  const camTop = scene.cameras.main.scrollY;
  const camBot = camTop + scene.scale.height;

  const bandTop = player.y - GAP_MAX_FRAC * h;
  const bandBot = player.y - GAP_MIN_FRAC * h;

  /* ---- 1) Cull only when truly below the screen ---- */
  const killY = camBot + 4;
  let culled = 0;
  scene.platforms.children.iterate(p => {
    if (p && p.y > killY) { p.destroy(); culled++; }
  });

  const totalNow = countPlatforms(scene);

  /* ---- 2) First landing: seed a full ladder + off-screen headroom ---- */
  if (!scene._seeded) {
    seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot);
    scene._seeded = true;
    return;
  }

  /* ---- 3) After seeding: if anything fell off, add exactly one at the (preferably off-screen) top ---- */
  if (
    culled > 0 &&
    totalNow < PLATFORM_POOL_CAP &&
    currentInView(scene, camTop, camBot) < MAX_IN_VIEW
  ) {
    const created = spawnOneAtTopPreferOffscreen(scene, player, h, reach, camTop);
    // Maybe add a minimal optional between the new top rung and the previous top-most rung — prefer off-screen too
    if (created?.main && created.prevTop) {
      maybeSpawnOptionalBetween(scene, player, created.prevTop, created.main, h, reach, {
        offscreenY: camTop - OPTIONAL_OFFSCREEN_BUFFER
      });
    }
  }

  /* ---- 4) Optional recycle (move, not create) ---- */
  const keep = [];
  scene.platforms.children.iterate(p => {
    if (!p) return;
    const inBand = p.y < player.y && p.y >= bandTop && p.y <= bandBot;
    const inReach = Math.abs(p.x - player.x) <= reach;
    if (inBand && inReach) keep.push(p);
  });

  if (landedPlatform && keep.length > 0) {
    const lowest = keep.slice().sort((a, b) => b.y - a.y)[0];
    if (landedPlatform === lowest) {
      placeReachableInBand(scene, landedPlatform, player, h, reach, "balanced");
      landedPlatform.refreshBody?.();
    }
  }
}

/* ---------------- Seeding & Top-layer helpers ---------------- */

function seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot) {
  const minGap = GAP_MIN_FRAC * h;
  const maxGap = GAP_MAX_FRAC * h;
  const topLimit = camTop + 12; // inside the view for initial fill

  // First rung near the bottom of the band
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
  p1.isEssential = true;
  p1.refreshBody?.();

  let prev = p1;
  let safetyCounter = 0;

  // Stage A: fill up to (just inside) the visible top
  while (
    prev.y - maxGap > topLimit &&
    currentInView(scene, camTop, camBot) < MAX_IN_VIEW &&
    countPlatforms(scene) < PLATFORM_POOL_CAP &&
    safetyCounter++ < 100
  ) {
    const next = new Platform(scene, 0, 0);
    const gap = Phaser.Math.FloatBetween(minGap, maxGap);
    let y = Math.max(topLimit, prev.y - gap);

    const minX = Math.max(X_PADDING, prev.x - reach);
    const maxX = Math.min(scene.scale.width - X_PADDING, prev.x + reach);

    let ok = false;
    for (let t = 1; t <= MAX_TRIES; t++) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
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
      next.isEssential = true;
      next.refreshBody?.();

      // Optionals during seed render as part of the initial layout, but must stay out of the essential corridor
      maybeSpawnOptionalBetween(scene, player, next, prev, h, reach);

      prev = next;
    } else {
      next.destroy();
      break;
    }
  }

  // Optional: try to snap exactly at topLimit if we didn't land close enough
  if (
    prev.y - minGap > topLimit &&
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
    if (ok) { last.isEssential = true; last.refreshBody?.(); prev = last; } else { last.destroy(); }
  }

  // Stage B: prebuild a short off-screen headroom stack so future spawns stay invisible
  for (let i = 0; i < SEED_HEADROOM_JUMPS; i++) {
    if (countPlatforms(scene) >= PLATFORM_POOL_CAP) break;

    const next = new Platform(scene, 0, 0);
    const gap = Phaser.Math.FloatBetween(minGap, maxGap);
    let y = prev.y - gap;

    // choose an X reachable from prev
    const minX = Math.max(X_PADDING, prev.x - reach);
    const maxX = Math.min(scene.scale.width - X_PADDING, prev.x + reach);

    let ok = false;
    for (let t = 1; t <= MAX_TRIES; t++) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      const dy = prev.y - y;
      const dx = Math.abs(x - prev.x);
      if (dy < minGap || dy > maxGap || dx > reach) continue;

      if (!canPlaceWithSpacing(scene, x, y, next, player, 1.0)) continue;

      next.setPosition(x, y);
      ok = true;
      break;
    }

    if (ok) {
      next.isEssential = true;
      next.refreshBody?.();
      prev = next;
    } else {
      next.destroy();
      break;
    }
  }
}

/** Spawn exactly one platform near/above the current camera, preferring off-screen but NEVER creating an unreachable gap. */
function spawnOneAtTopPreferOffscreen(scene, player, h, reach, camTop) {
  const minGap = GAP_MIN_FRAC * h;
  const maxGap = GAP_MAX_FRAC * h;

  const offscreenTop = camTop - OFFSCREEN_SPAWN_BUFFER;

  const children = scene.platforms.getChildren().filter(Boolean);
  if (children.length === 0) return null;

  const prevTop = children.slice().sort((a, b) => a.y - b.y)[0];

  // Compute a gap that (1) keeps it reachable, (2) puts it off-screen if possible.
  const desiredGapToOffscreen = prevTop.y - offscreenTop;
  const gap = Phaser.Math.Clamp(desiredGapToOffscreen, minGap, maxGap);

  // Final y: off-screen when possible, otherwise at prevTop.y - maxGap (still reachable).
  const y = prevTop.y - gap;

  const p = new Platform(scene, 0, 0);
  const minX = Math.max(X_PADDING, prevTop.x - reach);
  const maxX = Math.min(scene.scale.width - X_PADDING, prevTop.x + reach);

  for (let t = 1; t <= MAX_TRIES; t++) {
    const x = Phaser.Math.FloatBetween(minX, maxX);
    const dy = prevTop.y - y, dx = Math.abs(x - prevTop.x);
    if (dy < minGap || dy > maxGap || dx > reach) continue;

    const relax = relaxFactorForTry(Math.max(RELAX_START_TRY, t));
    if (!canPlaceWithSpacing(scene, x, y, p, player, relax)) continue;

    p.setPosition(x, y);
    p.isEssential = true;
    p.refreshBody?.();
    return { main: p, prevTop };
  }
  p.destroy();
  return null;
}

/* ----------- Minimal optional platform placement (kept out of essential corridor) ----------- */

function maybeSpawnOptionalBetween(scene, player, upper, lower, h, reach, opts = {}) {
  if (Math.random() > OPTIONAL_SPAWN_CHANCE) return;
  if (countOptionalInView(scene) >= OPTIONAL_MAX_IN_VIEW) return;
  if (countPlatforms(scene) >= PLATFORM_POOL_CAP) return;
  if (currentInView(scene, scene.cameras.main.scrollY, scene.cameras.main.scrollY + scene.scale.height) >= MAX_IN_VIEW) return;

  const gap = lower.y - upper.y;
  if (gap <= 0) return;

  // Y: bias toward LOWER rung to increase headroom to the upper rung
  const frac = Phaser.Math.FloatBetween(OPTIONAL_Y_FRACTION_MIN, OPTIONAL_Y_FRACTION_MAX);
  const proposedY = lower.y - gap * frac;
  if (proposedY >= player.y) return;

  // If caller requested off-screen, only place if it will be off-screen; otherwise skip (keep optionals minimal)
  if (opts.offscreenY != null && !(proposedY <= opts.offscreenY)) return;

  // Require extra vertical room to the upper rung
  const minUpClearUpper = OPTIONAL_MIN_UP_CLEAR_PLAYER_MULT * getPlayerHeight(player);
  const upClearUpper = proposedY - upper.y;
  if (upClearUpper < minUpClearUpper) return;

  const w = scene.scale.width;
  const center = (upper.x + lower.x) / 2;
  const targetSide = center < w / 2 ? "right" : "left";

  const minAway = OPTIONAL_MIN_AWAY_FRAC * reach;
  const minFromAnchor = OPTIONAL_MIN_X_FROM_ANCHOR_FRAC * reach;

  const leftRange = [X_PADDING, Math.max(X_PADDING, center - reach)];
  const rightRange = [Math.min(w - X_PADDING, center + reach), w - X_PADDING];
  const ranges = targetSide === "right" ? [rightRange, leftRange] : [leftRange, rightRange];

  for (const [rx0, rx1] of ranges) {
    let placed = false;

    for (let t = 1; t <= Math.floor(MAX_TRIES / 2); t++) {
      const x = Phaser.Math.FloatBetween(rx0, rx1);

      // Farther from center path and each anchor (more X)
      if (Math.abs(x - center) < minAway) continue;
      if (Math.abs(x - upper.x) < minFromAnchor) continue;
      if (Math.abs(x - lower.x) < minFromAnchor) continue;

      // Must be reachable from at least one anchor
      if (!canReach(lower.x, lower.y, x, proposedY, h, reach) && !canReach(upper.x, upper.y, x, proposedY, h, reach)) {
        continue;
      }

      // Keep out of the essential corridor (no-fly zone around the straight path lower->upper)
      if (!isOutsideEssentialCorridor(player, x, proposedY, upper, lower, reach)) {
        continue;
      }

      // Ensure clearance to the nearest platform above (not only the upper rung)
      const nearestAbove = getNearestPlatformAbove(scene, proposedY);
      if (nearestAbove) {
        const minUpClearAny = OPTIONAL_MIN_UP_CLEAR_ANY_MULT * getPlayerHeight(player);
        const upClearAny = proposedY - nearestAbove.y;
        if (upClearAny < minUpClearAny) continue;
      }

      const p = new Platform(scene, 0, 0);
      p.isOptional = true;

      const relax = 1.0;
      if (!canPlaceWithSpacing(scene, x, proposedY, p, player, relax)) {
        p.destroy();
        continue;
      }

      p.setPosition(x, proposedY);
      p.refreshBody?.();
      placed = true;
      break;
    }

    if (placed) break;
  }
}

/* ---------------- Existing helpers (+ head-clear rule uses .blocks when available) ---------------- */

function countPlatforms(scene) {
  return scene.platforms.getChildren().filter(Boolean).length;
}

function countOptionalInView(scene) {
  const camTop = scene.cameras.main.scrollY;
  const camBot = camTop + scene.scale.height;
  return scene.platforms.getChildren().filter(p => p && p.isOptional && p.y >= camTop && p.y <= camBot).length;
}

function currentInView(scene, camTop, camBot) {
  return scene.platforms.getChildren().filter(p => p && p.y >= camTop && p.y <= camBot).length;
}

function getNearestPlatformAbove(scene, y) {
  let nearest = null;
  let bestY = -Infinity;
  scene.platforms.children.iterate(p => {
    if (!p) return;
    if (p.y < y && p.y > bestY) {
      bestY = p.y;
      nearest = p;
    }
  });
  return nearest;
}

function isOutsideEssentialCorridor(player, x, y, upper, lower, reach) {
  // Interpolate along the straight path from lower -> upper to find the expected path X at Y.
  const totalDy = lower.y - upper.y;
  if (totalDy <= 0) return true; // degenerate; don’t block

  const t = Phaser.Math.Clamp((lower.y - y) / totalDy, 0, 1);
  const xPath = Phaser.Math.Linear(lower.x, upper.x, t);

  const corridorHalf =
    Math.max(
      ESSENTIAL_CORRIDOR_FRAC * reach,
      ESSENTIAL_CORRIDOR_MIN_PX,
      getPlayerWidth(player) * 0.9,
      Math.min(getPlatformWidth(lower), getPlatformWidth(upper)) * 0.45
    );

  return Math.abs(x - xPath) >= corridorHalf;
}

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
    if (y >= player.y) continue;

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

function placeAt(scene, platform, x, y, player, h, reach) {
  if (y >= player.y) return false;
  if (!canReach(player.x, player.y, x, y, h, reach)) return false;

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
 * Spacing with head-clear:
 *  - Reject if too close on BOTH axes.
 *  - If a narrow (basic_1) sits below a much wider platform within a normal step gap,
 *    require extra horizontal offset (head-clear) to avoid underside bonks.
 *  - Uses `.blocks` metadata when available; otherwise falls back to pixel widths.
 */
function canPlaceWithSpacing(scene, x, y, platform, player, relax = 1.0) {
  const minYGap = Math.max(1, V_SPACING_PLAYER_MULT * relax * getPlayerHeight(player));
  const widthSelf = getPlatformWidth(platform);
  const blocksSelf = platform?.blocks ?? null;

  const h = maxJumpHeight(scene, player);
  const bandMin = GAP_MIN_FRAC * h;
  const bandMax = GAP_MAX_FRAC * h;

  const isBasic = (platform.texture?.key === "basic_1");

  for (const peer of scene.platforms.getChildren()) {
    if (!peer || peer === platform) continue;

    const dx = Math.abs(x - peer.x);
    const dyAbs = Math.abs(y - peer.y);

    const widthPeer = getPlatformWidth(peer);
    const blocksPeer = peer?.blocks ?? null;

    const minXGap = Math.max(1, H_SPACING_MULT * relax * Math.max(widthSelf, widthPeer));

    if (dx < minXGap && dyAbs < minYGap) return false;

    // Head-clear: candidate below a wider platform within a normal step gap
    const dySigned = y - peer.y; // > 0 means candidate is below 'peer'

    // Prefer block-count comparison when both are known; otherwise fall back to pixel width ratio.
    const peerMuchWider =
      (blocksSelf != null && blocksPeer != null)
        ? (blocksPeer >= blocksSelf * 1.5)
        : (widthPeer >= widthSelf * 1.5);

    if (isBasic && peerMuchWider && dySigned > 0 && dySigned >= bandMin * 0.8 && dySigned <= bandMax * 1.2) {
      const minHeadClear = Math.max(HEAD_CLEAR_FRAC * widthPeer, getPlayerWidth(player) * 0.8);
      if (dx < minHeadClear) return false;
    }
  }
  return true;
}

const RELAX_START_TRY = 24;
const RELAX_STEP = 0.05;
const RELAX_MIN = 0.80;

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
  return (src && src.width) ? src.width : 64;
}

function getPlayerWidth(player) {
  if (player.displayWidth) return player.displayWidth;
  if (player.body?.width) return player.body.width;
  return 24;
}

function getPlayerHeight(player) {
  if (player.displayHeight) return player.displayHeight;
  if (player.body?.height) return player.body.height;
  return 32;
}

function maxJumpHeight(scene, player) {
  const g = Math.max(1, scene.physics.world.gravity.y);
  const v = Math.abs(player.jumpSpeed ?? -500);
  return (v * v) / (2 * g);
}

function horizontalReach(scene, player) {
  const g = Math.max(1, scene.physics.world.gravity.y);
  const v = Math.abs(player.jumpSpeed ?? -500);
  const airtime = (2 * v) / g;
  const speed = player.moveSpeed ?? 200;
  return Math.floor(speed * airtime * SAFETY);
}

function canReach(x0, y0, x1, y1, maxH, reach) {
  const dy = y0 - y1;
  const dx = Math.abs(x1 - x0);
  return dy > 0 && dy <= maxH && dx <= reach;
}
