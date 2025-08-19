import Phaser from "phaser";
import Platform from "../sprites/Platform";
import Enemy from "../sprites/Enemy";
import spawnPlatforms from '../functions/spawnPlatforms';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
  }

  create() {
    console.log("GameScene");
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    // Create the tilemap
    const map = this.make.tilemap({ key: "tilemap" });
    const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");

    // Create layers
    const ground = map.createLayer("ground", tileset, 0, 0);
    const leftWall = map.createLayer("leftWall", tileset, 0, 0);
    const rightWall = map.createLayer("rightWall", tileset, 0, 0);
    const background = map.createLayer("background", tileset, 0, 0);

    // Set depths
    background.setDepth(0);
    ground.setDepth(1);
    leftWall.setDepth(1);
    rightWall.setDepth(1);

    // Set scroll factors
    background.setScrollFactor(0);
    ground.setScrollFactor(0);
    leftWall.setScrollFactor(0);
    rightWall.setScrollFactor(0);

    // Initialize platforms
    this.platforms = this.physics.add.staticGroup();
    
    // Create player
    this.player = this.physics.add.sprite(
      gameWidth / 2,
      gameHeight * 0.75,
      "player"
    );
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platforms);
    // Setup controls
    this.cursors = this.input.keyboard.addKeys("W,A,S,D");

    // Initialize groups
    this.coins = this.physics.add.group();
    this.enemies = this.physics.add.group();

    // Add colliders
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.collectCoin,
      null,
      this
    );
    this.physics.add.collider(
      this.player,
      this.enemies,
      this.hitEnemy,
      null,
      this
    );

    // Setup score text
    this.scoreText = this.add
      .text(10, 10, "Score: 0", {
        fontSize: "24px",
        fill: "#000",
      })
      .setScrollFactor(0);

    // Camera settings
    this.cameras.main.startFollow(this.player, false, 0, 1);
    this.cameras.main.setLerp(0, 0.1);
    this.cameras.main.setDeadzone(0, gameHeight * 0.7);
    this.cameras.main.setBounds(0, 0, gameWidth, Number.MAX_SAFE_INTEGER);
  }

  update() {
    const gameHeight = this.sys.game.config.height;

    // Movement
    if (this.cursors.A.isDown) {
      this.player.setVelocityX(-200);
    } else if (this.cursors.D.isDown) {
      this.player.setVelocityX(200);
    } else {
      this.player.setVelocityX(0);
    }

    // Jump
    if (this.cursors.W.isDown && this.player.body.blocked.down) {
      this.player.setVelocityY(-500);
    }

    // Game over if player falls below the screen
    if (this.player.y > this.cameras.main.scrollY + gameHeight) {
      this.scene.start("GameOverScene", { score: this.score });
    }

    // Spawn platforms
    spawnPlatforms(this, this.player);
  }

  collectCoin(player, coin) {
    coin.destroy();
    this.score += 10;
    this.scoreText.setText("Score: " + this.score);
  }

  hitEnemy() {
    this.scene.start("GameOverScene", { score: this.score });
  }

  spawnCoin() {
    const gameWidth = this.sys.game.config.width;
    const x = Phaser.Math.Between(50, gameWidth - 50);
    const y = this.cameras.main.scrollY - 50;
    this.coins.create(x, y, "coin").setScale(0.1);
  }

  spawnEnemy() {
    const gameWidth = this.sys.game.config.width;
    const x = Phaser.Math.Between(50, gameWidth - 50);
    const y = this.cameras.main.scrollY - 50;
    new Enemy(this, x, y);
  }
}