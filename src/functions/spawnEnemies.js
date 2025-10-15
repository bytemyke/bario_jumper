// src/functions/spawnEnemies.js
import Phaser from "phaser";
import Stump from "../sprites/enemies/Stump";
import SpikeyShell from "../sprites/enemies/SpikeyShell";
import BigShell from "../sprites/enemies/BigShell";
import SmallShell from "../sprites/enemies/SmallShell";

/* --- Difficulty (step ramp) --- */
// min: +15% every 200 score
const STEP_SIZE = 200;
const STEP_GAIN = 0.15;
const MAX_T = 1.0;
function difficultyT(score) {
  const steps = Math.floor(Math.max(0, score) / STEP_SIZE);
  return Math.min(MAX_T, steps * STEP_GAIN);
}

/* --- Spawn-rate curve --- */
// min: map t∈[0..1] to chance ∈ [10%..85%]
const BASE_CHANCE = 0.10;
const MAX_CHANCE = 0.85;
function enemySpawnChance(score) {
  const t = difficultyT(score);
  return Phaser.Math.Clamp(BASE_CHANCE + (MAX_CHANCE - BASE_CHANCE) * t, 0, 1);
}

/* --- Enemy-type mix --- */
// min: shift from safer (stump/big) → trickier (spikey/small) as t rises
function pickEnemyTypeForScore(score) {
  const t = difficultyT(score);
  const wStump   = 0.50 * (1 - t) + 0.10 * t; // fades
  const wBig     = 0.35 * (1 - t) + 0.15 * t; // fades
  const wSpikey  = 0.10 * (1 - t) + 0.45 * t; // rises
  const wSmall   = 0.05 * (1 - t) + 0.30 * t; // rises
  const pool = [
    { k: "stump",     w: wStump },
    { k: "bigShell",  w: wBig },
    { k: "spikey",    w: wSpikey },
    { k: "smallShell",w: wSmall },
  ].filter(e => e.w > 0.0001);

  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of pool) { r -= e.w; if (r <= 0) return e.k; }
  return pool[pool.length - 1].k;
}

/* --- Fairness guards --- */
// min: keep spawns near visible area and not directly on player
const OFFSCREEN_TOP_BUFFER = 64;
const MIN_PLAYER_X_GAP = 48;

function isFairToSpawn(scene, platform) {
  const cam = scene.cameras?.main;
  if (!cam) return true;
  const camTop = cam.scrollY;
  const camBot = camTop + cam.height;

  // allow slightly above top, but not far off-screen
  if (platform.y < camTop - OFFSCREEN_TOP_BUFFER) return false;
  if (platform.y > camBot) return false;

  const px = scene.player?.x ?? 0;
  if (Math.abs((platform.x ?? 0) - px) < MIN_PLAYER_X_GAP) return false;

  return true;
}

/* --- API: attach enemy to a platform (called by platform spawner) --- */
export function maybeAttachEnemy(scene, platform) {
  // only wide-enough rungs to keep fights fair (e.g., 4–5 blocks)
  if (!platform || ![4, 5].includes(platform.blocks ?? 1)) return;

  if (!isFairToSpawn(scene, platform)) return;

  const score = scene?.score ?? scene?.state?.score ?? 0;
  if (Math.random() > enemySpawnChance(score)) return;

  // choose a safe-x on the platform top
  const pw = platform.displayWidth ?? platform.body?.width ?? 64;
  const half = pw / 2;
  const left = (platform.x ?? 0) - half + 10;
  const right = (platform.x ?? 0) + half - 10;
  const spawnX = Phaser.Math.FloatBetween(left, right);

  // min: compute platform top (pixels)
  const platTop =
    (platform.body?.top ??
      (platform.y ?? 0) - (platform.displayHeight ?? platform.body?.height ?? 0) / 2);

  const type = pickEnemyTypeForScore(score);
  let enemy = null;

  switch (type) {
    case "stump":
      enemy = new Stump(scene, platform, spawnX);
      break;
    case "spikey":
      enemy = new SpikeyShell(scene, platform, spawnX);
      break;
    case "bigShell":
      enemy = new BigShell(scene, platform, spawnX);
      break;
    case "smallShell":
      enemy = new SmallShell(scene, platform, spawnX);
      break;
  }

  if (enemy) {
    // min: place center so feet sit on platform top
    const eH = enemy.body?.height ?? enemy.displayHeight ?? 16;
    const spawnY = platTop - eH / 2 - 0.5;
    enemy.setPosition(spawnX, spawnY);

    // min: ensure enemy collides with static platforms
    scene.physics.add.collider(enemy, scene.platforms);
  }
}
