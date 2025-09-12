import Phaser from "phaser";
import PLATFORM_TYPES from "../data/PlatformTypes.json";

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

    this.load.image("basic_3", "cartoon/platforms/basic_3.png");
    this.load.image("basic_1", "cartoon/platforms/basic_1.png");
    this.load.image("falling_3", "cartoon/platforms/falling_3.png");
    // =Enemy sprites=
    // TODO: put YOUR real frame sizes below for each sheet
// =Enemy sprites= (3x1 sheets; per-frame is 16x16)
this.load.spritesheet("stump_brown","cartoon/enemies/stump_brown.png",{ frameWidth: 16, frameHeight: 16 });
this.load.spritesheet("stump_red","cartoon/enemies/stump_red.png",{ frameWidth: 16, frameHeight: 16 });
this.load.spritesheet("stump_blue","cartoon/enemies/stump_blue.png",{ frameWidth: 16, frameHeight: 16 });

this.load.spritesheet("spikeyShell_yellow","cartoon/enemies/spikeyShell_yellow.png",{ frameWidth: 16, frameHeight: 16 });
this.load.spritesheet("spikeyShell_blue","cartoon/enemies/spikeyShell_blue.png",{ frameWidth: 16, frameHeight: 16 });
this.load.spritesheet("spikeyShell_red","cartoon/enemies/spikeyShell_red.png",{ frameWidth: 16, frameHeight: 16 });
this.load.spritesheet("spikeyShell_darkGrey","cartoon/enemies/spikeyShell_darkGrey.png",{ frameWidth: 16, frameHeight: 16 });



    // Dynamically load any additional platform images declared in JSON
this.loadPlatforms();

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

    // Load the 3-frame sheet for spring so we can build the spring animation later.
    this.load.spritesheet("green_spring", "cartoon/sprites/green_spring.png", {
      frameWidth: 16,
      frameHeight: 24,
    });
    const t = this.textures.get("green_spring");
    console.log("[green_spring] exists:", !!t, "frames:", t?.frameTotal);

    //     // Load tileset image
    // this.load.image("tiles", "assets/tileset.png");

    // // Load tilemap JSON (made in Tiled)
    // this.load.tilemapTiledJSON("map", "assets/level1.json");

    this.load.image("gandcTiles", "cartoon/Ground-and-Ceiling.png");
    this.load.image("backgroundTexture", "cartoon/background_middle.png");
    this.load.tilemapTiledJSON("tilemap", "map.json");
  }
    loadPlatforms() {
    const seen = new Set();
    (PLATFORM_TYPES || []).forEach((p) => {
      const blocks = (p?.basic ?? p?.blocks);
      const type = p?.type;
      if (!type || !blocks) return;

      const key = `${type}_${blocks}`; // e.g., "basic_3"
      if (seen.has(key) || this.textures.exists(key)) return;

      // Respect this.load.setPath("assets"): do NOT start with '/'
      this.load.image(key, `cartoon/platforms/${key}.png`);
      seen.add(key);
    });
  }

  create() {
      console.log(
    "[preload] enemy keys exist?:",
    "stump_brown", this.textures.exists("stump_brown"),
    "stump_red", this.textures.exists("stump_red"),
    "stump_blue", this.textures.exists("stump_blue"),
    "spikeyShell_yellow", this.textures.exists("spikeyShell_yellow"),
    "spikeyShell_blue", this.textures.exists("spikeyShell_blue"),
    "spikeyShell_red", this.textures.exists("spikeyShell_red"),
    "spikeyShell_darkGrey", this.textures.exists("spikeyShell_darkGrey")
  );

    this.scene.start("GameScene");
  }
}
