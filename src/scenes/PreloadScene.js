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
    this.load.image("gandcTiles", "cartoon/Ground-and-Ceiling.png");
    //might be sprite sheet
    this.load.spritesheet('platform', 'cartoon/Ground-and-Ceiling.png', {
        frameWidth: 16,
        frameHeight: 16
    });
    

    this.load.image("interactablesTiles", "cartoon/Interactables.png");
    this.load.image("itemsTiles", "cartoon/Items.png");
    this.load.spritesheet("player", "cartoon/hero.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    // this.load.spritesheet("enemy", "cartoon/mushroom_walk.png", {
    //   frameWidth: 16,
    //   frameHeight: 16,
    // });
    // this.load.image("coin", "coin.png");
    // this.load.spritesheet("coin","coin.png", {frameWidth: 50, frameHeight: 50});
this.load.spritesheet("coin", "coin.png", {
  frameWidth: 331,
  frameHeight: 331
});

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
