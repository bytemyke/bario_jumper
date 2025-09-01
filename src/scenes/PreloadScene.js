import Phaser from "phaser";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    // All asset paths are relative to this directory
    this.load.setPath("assets");

    // Player spritesheet
    this.load.spritesheet("player", "cco/bario_mini.png", {
      frameWidth: 18,
      frameHeight: 17,
    });

    // === Platforms (TileType_TileAmount convention) ===
    // 1-block narrow platform
    this.load.image("basic_1", "cartoon/basic_1.png");
    // 3-block wide platform (formerly 'castle_platform')
    this.load.image("basic_3", "cartoon/castle_platform.png");

    // Ground & ceiling tiles (for your Tilemap)
    this.load.image("gandcTiles", "cartoon/Ground-and-Ceiling.png");

    // Tiled JSON map (if used)
    this.load.tilemapTiledJSON("tilemap", "map.json");
  }

  create() {
    // Move straight to the menu once assets are ready
    this.scene.start("MenuScene");
  }
}
