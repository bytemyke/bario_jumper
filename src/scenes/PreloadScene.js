import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.setPath("assets");
    // this.load.image("platform", "assets/platform.png");
    // this.load.image("coin", "assets/coin.png");
    // this.load.image("enemy", "assets/enemy.png");
    this.load.spritesheet("mini_player", "cco/bario_mini.png", {
      frameWidth: 18,
      frameHeight: 17,
    });

    // ✨ Alias: keep legacy code that uses the "player" key working
    this.load.spritesheet("player", "cco/bario_mini.png", {
      frameWidth: 18,
      frameHeight: 17,
    });

    this.load.spritesheet("big_player", "cco/bario_big.png", {
      frameWidth: 18,
      frameHeight: 33,
    });

    this.load.image("flower", "cco/flower_level_up.png");
    this.load.spritesheet("mushroom", "cco/mushroom_level_up.png", {
      frameWidth: 74 / 2,
      frameHeight: 32,
    });
    this.load.spritesheet(
      "mini_to_big",
      "cco/bario_mini_to_big_transform-Sheet.png",
      {
        frameWidth: 18,
        frameHeight: 33,
      }
    );

    this.load.image("castle_platform", "cartoon/castle_platform.png");
    // ✨ Add naming-convention alias (TileType_TileAmount)
    this.load.image("basic_3", "cartoon/castle_platform.png");
    this.load.image("basic_1", "cartoon/basic_1.png");
    // this.load.spritesheet("enemy", "cartoon/mushroom_walk.png", {
    //   frameWidth: 16,
    //   frameHeight: 16,
    // });
    // this.load.image("coin", "coin.png");
    // this.load.spritesheet("coin","coin.png", {frameWidth: 50, frameHeight: 50});
    this.load.spritesheet("coin", "coin.png", {
      frameWidth: 331,
      frameHeight: 331,
    });

    //     // Load tileset image
    // this.load.image("tiles", "assets/tileset.png");

    // // Load tilemap JSON (made in Tiled)
    // this.load.tilemapTiledJSON("map", "assets/level1.json");

    this.load.image("gandcTiles", "cartoon/Ground-and-Ceiling.png");

    this.load.tilemapTiledJSON("tilemap", "map.json");
  }

  create() {
    // 🔧 Ensure core animations exist globally before any sprite tries to play them
    ensurePlayerAnims(this);

    console.log("PreloadScene");
    this.scene.start("MenuScene");
  }
}

/** Define 'idle', 'run', 'jump' for the 'player' sheet (safe if already exist). */
function ensurePlayerAnims(scene) {
  const anims = scene.anims;
  const sheetKey = "player";

  // Determine the available frame count (clamp ranges to be safe)
  const tex = scene.textures.get(sheetKey);
  const frameNames = tex ? tex.getFrameNames() : [];
  const lastIndex = Math.max(0, frameNames.length - 1);

  const clamp = (i) => Math.max(0, Math.min(i, lastIndex));
  const frames = (start, end) =>
    anims.generateFrameNumbers(sheetKey, { start: clamp(start), end: clamp(end) });

  if (!anims.exists("idle")) {
    anims.create({
      key: "idle",
      frames: frames(0, 0),
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!anims.exists("run")) {
    anims.create({
      key: "run",
      frames: frames(1, 4),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!anims.exists("jump")) {
    anims.create({
      key: "jump",
      frames: frames(5, 5),
      frameRate: 1,
      repeat: -1,
    });
  }
}
