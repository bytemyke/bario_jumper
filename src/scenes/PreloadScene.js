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

    // PSEUDOCODE: Load the 3-frame sheet (16×24 per frame) so we can build the spring animation later.
this.load.spritesheet("green_spring", "cartoon/green_spring.png", {
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

    this.load.tilemapTiledJSON("tilemap", "map.json");
  }

  create() {
    console.log("PreloadScene");
    this.scene.start("MenuScene");
  }
}