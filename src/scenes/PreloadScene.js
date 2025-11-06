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
    this.loadControls();
    this.load.spritesheet("mini_player", "cco/bario_mini.png", {
      frameWidth: 18,
      frameHeight: 17,
    });

    this.load.spritesheet("big_player", "cco/bario_big.png", {
      frameWidth: 18,
      frameHeight: 33,
    });
    this.load.spritesheet(
      "mini_to_big",
      "cco/bario_mini_to_big_transform-Sheet.png",
      {
        frameWidth: 18,
        frameHeight: 33,
      }
    );

    //load enemies
    this.loadEnemies();
    // Dynamically load any additional platform images declared in JSON
    this.loadPlatforms();

    this.load.spritesheet("coin", "coin.png", {
      frameWidth: 331,
      frameHeight: 331,
    });
    this.load.spritesheet("mushroom", "cco/mushroom_level_up.png", {
      frameWidth: 74 / 2,
      frameHeight: 32,
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
  loadPlatforms() {
    const seen = new Set();
    (PLATFORM_TYPES || []).forEach((p) => {
      const blocks = p?.basic ?? p?.blocks;
      const type = p?.type;
      if (!type || !blocks) return;

      const key = `${type}_${blocks}`; // e.g., "basic_3"
      if (seen.has(key) || this.textures.exists(key)) return;

      // Respect this.load.setPath("assets"): do NOT start with '/'
      this.load.image(key, `cartoon/platforms/${key}.png`);
      seen.add(key);
    });
  }
  loadEnemies() {
    // =Enemy sprites=
    // TODO: put YOUR real frame sizes below for each sheet
    // =Enemy sprites= (3x1 sheets; per-frame is 16x16)
    this.load.spritesheet(
  "stump_brown",
  "cartoon/sprites/enemies/stump_brown.png",
  {
    frameWidth: 18,
    frameHeight: 16,
    spacing: 0,
  }
  );
    this.load.spritesheet(
      "stump_red",
      "cartoon/sprites/enemies/stump_red.png",
      {
        frameWidth: 18,
        frameHeight: 16,
        spacing: 0,
      }
    );
    this.load.spritesheet(
      "stump_blue",
      "cartoon/sprites/enemies/stump_blue.png",
      {
        frameWidth: 18,
        frameHeight: 16,
        spacing: 0,
      }
    );
    this.load.spritesheet(
      "spikeyShell_yellow",
      "cartoon/sprites/enemies/spikeyShell_yellow.png",
      { frameWidth: 18, frameHeight: 16 }
    );
    // =SmallShell sprites= (3x1; per-frame is 16x16)
    this.load.spritesheet(
      "smallShell_blue",
      "cartoon/sprites/enemies/smallShell_blue.png",
      { frameWidth: 18, frameHeight: 17 , spacing: 0}
    );
    this.load.spritesheet(
      "smallShell_darkGrey",
      "cartoon/sprites/enemies/smallShell_darkGrey.png",
      { frameWidth: 18, frameHeight: 17, spacing: 0 }
    );
    this.load.spritesheet(
      "bigShell_red",
      "cartoon/sprites/enemies/bigShell_red.png",
      {
        frameWidth: 18,
        frameHeight: 24,
      }
    );
    this.load.spritesheet(
  "ghost",
  "cartoon/sprites/enemies/ghost.png",   // put your Ghost-Spritesheet.png here
  { frameWidth: 16, frameHeight: 16 }
);
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
      let key = p.type + "_" + p.blocks;
      this.load.image(key, "/cartoon/platforms/" + key + ".png");
    });
  }

  loadParticles() {
    this.load.image("small_debris", "cco/particles/grey_particle_small.png");
  }

  loadControls() {
    this.load.image("arrow_button", "cco/controls/arrow_button.png");
    this.load.image(
      "arrow_button_pressed",
      "cco/controls/arrow_button_pressed.png"
    );
    this.load.image("music_on", "cco/controls/music_on.png");
    this.load.image("music_off", "cco/controls/music_off.png");
  }
  create() {
    this.scene.start("GameScene");
  }
}
