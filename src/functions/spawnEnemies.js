// src/functions/spawnEnemies.js
import Phaser from "phaser";
import Stump from "../sprites/enemies/Stump";
import SpikeyShell from "../sprites/enemies/SpikeyShell";
import BigShell from "../sprites/enemies/BigShell";
import SmallShell from "../sprites/enemies/SmallShell";


// Tune this to taste:
const ENEMY_SPAWN_CHANCE = 0.25; // 45% of eligible rungs get an enemy

// Only spawn on 
export function maybeAttachEnemy(scene, platform) {
 if (!platform || ![4, 5].includes(platform.blocks ?? 1)) return;

  if (Math.random() > ENEMY_SPAWN_CHANCE) return;

  if (!scene.enemies) scene.enemies = scene.physics.add.group();

  // Place somewhere on top surface, a bit inset from the edges
  const margin = 12;
  const left = platform.x - platform.displayWidth / 2 + margin;
  const right = platform.x + platform.displayWidth / 2 - margin;
  const spawnX = Phaser.Math.FloatBetween(left, right);
  const spawnY = platform.y - platform.displayHeight / 2 - 8;

  // Choose a type to spawn. Keep it simple at first:
  const types = ["stump", "spikeyShell", "bigShell", "smallShell"];
  const type = Phaser.Utils.Array.GetRandom(types);

  let enemy;
  switch (type) {
    case "stump":
      enemy = new Stump(scene, platform, spawnX);
      break;
    case "spikeyShell":
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
    enemy.setPosition(spawnX, spawnY);
  }
}
