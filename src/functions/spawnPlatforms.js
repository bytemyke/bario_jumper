// src/functions/spawnPlatforms.js
import Phaser from "phaser";
import Platform from "../sprites/Platform";

/* ---------------- Tunables (density & difficulty) ---------------- */

// Hard cap on total platforms alive
const PLATFORM_POOL_CAP = 18; // a touch higher to allow more optionals

// Max platforms allowed in the camera view at once
const MAX_IN_VIEW = 14;

// Reach band (vertical)
const GAP_MIN_FRAC = 0.35;
const GAP_MAX_FRAC = 0.85;

// Horizontal reach safety margin (0..1)
const SAFETY = 0.85;

// Keep off the extreme edges
const X_PADDING = 40;

// Attempts when sampling a valid position
const MAX_TRIES = 40;

/* ---------------- Spacing rules (no blocking / no pinches) ---------------- */

const H_SPACING_MULT = 1.2;

// ⬇️ Doubled so Big Bario (2× tall) has safe clearance when platforms stack vertically
const V_SPACING_PLAYER_MULT = 4.8;

// Extra horizontal offset when a narrow sits below a much wider one
const HEAD_CLEAR_FRAC = 0.6;

/* ---------------- Optional platform policy (more, but out of the way) ---------------- */

// We’ll try to place up to this many *lateral* optionals per essential gap (left/right lanes).
const OPTIONALS_PER_GAP_TARGET = 3;

// Overall visible optional cap
const OPTIONAL_MAX_IN_VIEW = 12;

// Try to place optionals between rungs more often
// (top-of-screen spawns still prefer off-screen placement)
const OPTIONAL_SPAWN_CHANCE = 0.85;

// Place optionals farther from the straight path and anchor rungs
const OPTIONAL_MIN_AWAY_FRAC = 0.80;        // distance from “center path”
const OPTIONAL_MIN_X_FROM_ANCHOR_FRAC = 0.52;

// Bias optional Y toward the lower rung so there’s headroom to the upper
const OPTIONAL_Y_FRACTION_MIN = 0.28;
const OPTIONAL_Y_FRACTION_MAX = 0.50;

// Vertical room to the upper rung and nearest-above platform
const OPTIONAL_MIN_UP_CLEAR_PLAYER_MULT = 3.0;
const OPTIONAL_MIN_UP_CLEAR_ANY_MULT    = 2.8;

/* ---------------- Essential corridor (strict keep-out) ---------------- */

// Widen slightly so optionals never clutter the climb line
const ESSENTIAL_CORRIDOR_FRAC   = 0.45; // × horizontal reach
const ESSENTIAL_CORRIDOR_MIN_PX = 28;

/* ---------------- Off-screen behavior ---------------- */

const OFFSCREEN_SPAWN_BUFFER       = 64;
const OPTIONAL_OFFSCREEN_BUFFER    = 48;
const SEED_HEADROOM_JUMPS          = 3;

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

export function spawnPlatforms(scene, player, landedPlatform = null) {
  if (!scene._initialLandingDone) return;

  const h = maxJumpHeight(scene, player);
  const reach = horizontalReach(scene, player);

  const camTop  = scene.cameras.main.scrollY;
  const camBot  = camTop + scene.scale.height;

  const bandTop = player.y - GAP_MAX_FRAC * h;
  const bandBot = player.y - GAP_MIN_FRAC * h;

  /* ---- 1) Cull below screen AND count essentials removed ---- */
  const killY = camBot + 4;
  let essentialCulled = 0;
  let optionalCulled  = 0;

  scene.platforms.children.iterate(p => {
    if (p && p.y > killY) {
      const wasEssential = !!p.isEssential && !p.isOptional;
      const wasOptional  = !!p.isOptional;
      if (wasEssential) essentialCulled++;
      if (wasOptional)  optionalCulled++;
      p.destroy();
    }
  });

  /* ---- 2) Seed a full ladder + small off-screen headroom on first landing ---- */
  if (!scene._seeded) {
    seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot);
    scene._seeded = true;
    return;
  }

  /* ---- 3) Replenish exactly as many essentials as were culled (ignore caps for essentials) ---- */
  for (let i = 0; i < essentialCulled; i++) {
    const created = spawnOneAtTopPreferOffscreen(scene, player, h, reach, camTop);
    // Optionals between the new top and previous top (stay off-screen if possible)
    if (created?.main && created.prevTop) {
      spawnLateralOptionalsBetween(scene, player, created.prevTop, created.main, h, reach, {
        offscreenY: camTop - OPTIONAL_OFFSCREEN_BUFFER
      });
    }
  }

  /* ---- 4) Small recycle: gently reposition the last-landed platform into a fresh band spot ---- */
  const keep = [];
  scene.platforms.children.iterate(p => {
    if (!p) return;
    const inBand  = p.y < player.y && p.y >= bandTop && p.y <= bandBot;
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

/* ---------------- Seeding & top-layer helpers ---------------- */

function seedFullScreen(scene, player, h, reach, camTop, camBot, bandTop, bandBot) {
  const minGap   = GAP_MIN_FRAC * h;
  const maxGap   = GAP_MAX_FRAC * h;
  const topLimit = camTop + 12;

  // First rung near bottom of band
  const firstY   = Phaser.Math.Linear(bandTop, bandBot, 0.90);
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

  // Stage A: fill up to visible top
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

      // Try to place lateral optionals (left/right lanes) outside the essential corridor
      spawnLateralOptionalsBetween(scene, player, next, prev, h, reach);

      prev = next;
    } else {
      next.destroy();
      break;
    }
  }

  // Optional: snap another essential exactly at topLimit if feasible
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

  // Stage B: prebuild a short off-screen headroom stack
  for (let i = 0; i < SEED_HEADROOM_JUMPS; i++) {
    if (countPlatforms(scene) >= PLATFORM_POOL_CAP) break;

    const next = new Platform(scene, 0, 0);
    const gap = Phaser.Math.FloatBetween(minGap, maxGap);
    let y = prev.y - gap;

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

function spawnOneAtTopPreferOffscreen(scene, player, h, reach, camTop) {
  const minGap = GAP_MIN_FRAC * h;
  const maxGap = GAP_MAX_FRAC * h;

  const offscreenTop = camTop - OFFSCREEN_SPAWN_BUFFER;

  const children = scene.platforms.getChildren().filter(Boolean);
  if (children.length === 0) return null;

  const prevTop = children.slice().sort((a, b) => a.y - b.y)[0];

  const desiredGapToOffscreen = prevTop.y - offscreenTop;
  const gap = Phaser.Math.Clamp(desiredGapToOffscreen, minGap, maxGap);
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

/* ---------------- Lateral optionals (the “more options” logic) ---------------- */

/**
 * Place up to OPTIONALS_PER_GAP_TARGET optional platforms between `lower` and `upper`,
 * one per side (left/right), outside the essential corridor and within reach of at least one anchor.
 * If opts.offscreenY is provided, only place if the platform will be above that Y (keeps top spawns off-screen).
 */
function spawnLateralOptionalsBetween(scene, player, upper, lower, h, reach, opts = {}) {
  if (Math.random() > OPTIONAL_SPAWN_CHANCE) return;

  const want = OPTIONALS_PER_GAP_TARGET;
  let placed = 0;

  // Alternate sides so we don’t crowd one lane
  const order = Math.random() < 0.5 ? ["left", "right"] : ["right", "left"];

  for (const side of order) {
    if (placed >= want) break;
    const ok = placeOptionalOnSide(scene, player, upper, lower, h, reach, side, opts);
    if (ok) placed++;
  }

  // If we still want more (e.g., one side failed), try the other side once more
  if (placed < want) {
    for (const side of order) {
      if (placed >= want) break;
      const ok = placeOptionalOnSide(scene, player, upper, lower, h, reach, side, opts);
      if (ok) placed++;
    }
  }
}

function placeOptionalOnSide(scene, player, upper, lower, h, reach, targetSide, opts = {}) {
  if (countOptionalInView(scene) >= OPTIONAL_MAX_IN_VIEW) return false;
  if (countPlatforms(scene) >= PLATFORM_POOL_CAP) return false;

  const gap = lower.y - upper.y;
  if (gap <= 0) return false;

  // Y: bias toward LOWER rung
  const frac = Phaser.Math.FloatBetween(OPTIONAL_Y_FRACTION_MIN, OPTIONAL_Y_FRACTION_MAX);
  const proposedY = lower.y - gap * frac;
  if (proposedY >= player.y) return false;

  if (opts.offscreenY != null && !(proposedY <= opts.offscreenY)) return false;

  const minUpClearUpper = OPTIONAL_MIN_UP_CLEAR_PLAYER_MULT * getPlayerHeight(player);
  const upClearUpper = proposedY - upper.y;
  if (upClearUpper < minUpClearUpper) return false;

  // Pick an X range on the requested side
  const w = scene.scale.width;
  const center = (upper.x + lower.x) / 2;

  const leftRange  = [X_PADDING, Math.max(X_PADDING, center - reach)];
  const rightRange = [Math.min(w - X_PADDING, center + reach), w - X_PADDING];
  const [rx0, rx1] = targetSide === "right" ? rightRange : leftRange;

  // How far to stay from center path and each anchor
  const minAway = OPTIONAL_MIN_AWAY_FRAC * reach;
  const minFromAnchor = OPTIONAL_MIN_X_FROM_ANCHOR_FRAC * reach;

  for (let t = 1; t <= Math.floor(MAX_TRIES / 2); t++) {
    const x = Phaser.Math.FloatBetween(rx0, rx1);

    // Farther from path & anchors
    if (Math.abs(x - center) < minAway) continue;
    if (Math.abs(x - upper.x) < minFromAnchor) continue;
    if (Math.abs(x - lower.x) < minFromAnchor) continue;

    // Must be reachable from at least one anchor
    if (!canReach(lower.x, lower.y, x, proposedY, h, reach) && !canReach(upper.x, upper.y, x, proposedY, h, reach)) {
      continue;
    }

    // Keep out of essential corridor
    if (!isOutsideEssentialCorridor(player, x, proposedY, upper, lower, reach)) continue;

    // Also keep some room to the nearest platform above (not only the upper rung)
    const nearestAbove = getNearestPlatformAbove(scene, proposedY);
    if (nearestAbove) {
      const minUpClearAny = OPTIONAL_MIN_UP_CLEAR_ANY_MULT * getPlayerHeight(player);
      const upClearAny = proposedY - nearestAbove.y;
      if (upClearAny < minUpClearAny) continue;
    }

    const p = new Platform(scene, 0, 0);
    p.isOptional = true;

    if (!canPlaceWithSpacing(scene, x, proposedY, p, player, 1.0)) {
      p.destroy();
      continue;
    }

    p.setPosition(x, proposedY);
    p.refreshBody?.();
    return true;
  }

  return false;
}

/* ---------------- Utility & constraints ---------------- */

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
  const totalDy = lower.y - upper.y;
  if (totalDy <= 0) return true;

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
 * Spacing with head-clear and Big-Bario vertical safety:
 *  - Reject if too close on BOTH axes.
 *  - If a narrow (blocks === 1) sits below a much wider platform within a normal step gap,
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

  const isNarrow = (platform.blocks ?? 1) === 1;

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

    const peerMuchWider =
      (blocksSelf != null && blocksPeer != null)
        ? (blocksPeer >= blocksSelf * 1.5)
        : (widthPeer >= widthSelf * 1.5);

    if (isNarrow && peerMuchWider && dySigned > 0 && dySigned >= bandMin * 0.8 && dySigned <= bandMax * 1.2) {
      const minHeadClear = Math.max(HEAD_CLEAR_FRAC * widthPeer, getPlayerWidth(player) * 0.8);
      if (dx < minHeadClear) return false;
    }
  }
  return true;
}

/* ---------------- Physics-derived helpers ---------------- */

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
  const tex = p.scene?.textures?.get(p.texture?.key || "basic_3");
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
