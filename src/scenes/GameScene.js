import Phaser from "phaser";
import Platform from "../sprites/Platform";
import Enemy from "../sprites/Enemy";
import Player from "../sprites/Player";
import {spawnPlatforms, initializePlatforms}  from "../functions/spawnPlatforms"; 
import { createMap } from "../functions/createMap";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
  }
 
  create() {
    
    this.anims.create({
  key: "coinSpin",
  frames: this.anims.generateFrameNumbers("coin", { start: 0, end: 19 }),
  frameRate: 10,
  repeat: -1
});
    console.log("GameScene");

    this.score = 0;

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.scoreText = this.add
      .text(10, 10, "Score: 0", {
        fontSize: "24px",
        fill: "#000",
      })
      .setScrollFactor(0);

    this.player = new Player(this, gameWidth / 2, gameHeight * 0.75);
      
    this.cursors = this.input.keyboard.addKeys("W,A,S,D");

    this.coins = this.physics.add.group();
    this.enemies = this.physics.add.group();


  
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

    // Let the world extend far ABOVE 0 so the camera can go up
    const SKY = 100000; // big number
    this.cameras.main.setBounds(
      0,
      -SKY,
      gameWidth,
      SKY + Number.MAX_SAFE_INTEGER
    );

    // Keep player roughly mid-screen
    this.followOffsetY = gameHeight * 0.5;

    // Initialize camera position and the “never-go-down” tracker
    this.cameras.main.scrollY = this.player.y - this.followOffsetY;
    this.minScrollY = this.cameras.main.scrollY; // the smallest (highest) scrollY we’ve hit

    this.highestCameraY = this.cameras.main.scrollY;

    this.map = createMap(this, this.player);
    initializePlatforms(this, this.player);
    // setInterval(() => this.spawnCoin(), 1000);
  }

  update() {
    this.player.update();
    // Compute where we'd like the camera if it were allowed to move both ways
    const target = this.player.y - this.followOffsetY;
    console.log(this.platforms);
    spawnPlatforms(this, this.player);
    // Only allow the camera to move UP (remember: smaller scrollY = higher)
    if (target < this.minScrollY) {
      this.minScrollY = target;
    }
    this.cameras.main.scrollY = this.minScrollY; // never increases
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

  // Spawn just above the player
  const y = this.player.y - 100;

  const coin = this.coins.create(x, y, "coin", 0).setDepth(10).setScale(0.1);
coin.play("coinSpin");
coin.body.setAllowGravity(false);
  console.log(coin.x, coin.y);
  console.log("coin size:", coin.body.width, coin.body.height);
  console.log("player size:", this.player.body.width, this.player.body.height);
  console.log("spawned coin at", x, y, "playerY", this.player.y, "cameraY", this.cameras.main.scrollY);
  }

  spawnEnemy() {
    const gameWidth = this.sys.game.config.width;
    const x = Phaser.Math.Between(50, gameWidth - 50);
    const y = this.cameras.main.scrollY - 50;
    new Enemy(this, x, y);
  }
}