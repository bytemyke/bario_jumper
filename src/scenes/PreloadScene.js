import Phaser from "phaser";
import PLATFORM_TYPES from "../data/PlatformTypes.json";
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.setPath("assets");
    this.loadAudio();
    this.loadPlatforms();
    this.loadParticles();
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

    this.load.image("gandcTiles", "cartoon/Ground-and-Ceiling.png");
    // this.load.image("backgroundTexture", "cartoon/background_middle.png");
    this.load.tilemapTiledJSON("tilemap", "map.json");
  }

  loadAudio() {
    this.load.audio("bgm", "cco/audio/music/8-bit_mechanical_complex.mp3");
    this.load.audio("jump_sfx", "cco/audio/sfx/jump.wav");
    this.load.audio("spring_sfx", "cco/audio/sfx/spring1.wav");
    this.load.audio("touch_sfx", "cco/audio/sfx/touch01.wav");
    this.load.audio("coin_sfx", "cco/audio/sfx/coin.flac");
    // this.load.audio("game_over_sfx", "assets/audio/sfx/lose.wav");
  }
  loadPlatforms() {
  PLATFORM_TYPES.forEach((p) => {
    let key = p.type + "_" +  p.blocks
    this.load.image(key, "/cartoon/platforms/" + key + ".png");
  })
    
  }

  loadParticles() {
    this.load.image("small_debris", "cco/particles/grey_particle_small.png");
  }

  create() {
    this.scene.start("GameScene");
  }
}
