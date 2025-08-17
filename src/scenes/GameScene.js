import Phaser from "phaser";
import Platform from "../sprites/Platform";
import Enemy from "../sprites/Enemy";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
  }

  create() {
    console.log("GameScene");

    // Create the tilemap
    const map = this.make.tilemap({ key: "tilemap" });

    // Match the name of the tileset in Tiled (first argument) to the image you preloaded
    const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");
    console.log(tileset);
    // Add a layer (name must match the layer name in Tiled)
    // const backgroundLayer = map.createLayer("Background", tileset, 0, 0);
    const ground = map.createLayer("ground", tileset, 0, 0); 
    console.log(ground);
    //this.physics.add.collider(this.player, ground);
    ground.setCollisionByProperty({ collides: true });
    const leftWall = map.createLayer("leftWall", tileset, 0, 0);
    console.log(leftWall);

    const rightWall = map.createLayer("rightWall", tileset, 0, 0);
    console.log(rightWall);
    // Optionally a collision layer
    const background = map.createLayer("background", tileset, 0, 0);
    console.log(background);
    // wallLayer.setCollisionByProperty({ collides: true });

    // // // Example: collide the player with the tilemap ground
    // this.physics.add.collider(this.player, wallLayer);

    this.score = 0;

    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;

    this.scoreText = this.add
      .text(10, 10, "Score: 0", {
        fontSize: "24px",
        fill: "#000",
      })
      .setScrollFactor(0);

    // Player starts centered near the bottom
    this.player = this.physics.add.sprite(
      gameWidth / 2,
      gameHeight * 0.75,
      "player"
    );
    this.player.setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.addKeys("W,A,S,D");

    // Platforms scaled to screen height
    this.platforms = this.physics.add.staticGroup();
    const platformCount = 6;
    const spacing = gameHeight / (platformCount + 1);

    for (let i = 0; i < platformCount; i++) {
      new Platform(this, gameWidth / 2, gameHeight - i * spacing);
    }

    this.coins = this.physics.add.group();
    this.enemies = this.physics.add.group();

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

    // Camera follows only Y
    this.cameras.main.startFollow(this.player, false, 0, 1);
    this.cameras.main.setLerp(0, 1);
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
