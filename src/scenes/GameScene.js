import Phaser from "phaser";
import Platform from "../sprites/Platform";
import Ghost from "../sprites/enemies/Ghost";
import Enemy from "../sprites/Enemy";
import Player from "../sprites/Player";
import {
  spawnPlatforms,
  initializePlatforms,
  resetPlatformState,
} from "../functions/spawnPlatforms";
import { createMap, updateMap, updateBackground } from "../functions/createMap";
import UpgradeManager from "../classes/UpgradeManager";
import MuteButton from "../sprites/MuteButton";
import { setupCoins, updateCoins } from "../functions/coins";
import { setupDeathBar, updateDeathBar } from "../functions/deathBar";
import { maybeAttachEnemy, difficultyT } from "../functions/spawnEnemies";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.score = 0;
  }

  create() {
    resetPlatformState();
    this.events.once("shutdown", () => {
      this.resetGame();
    });
    this.cameras.main.roundPixels = true;
    //start background music
    this.bgm = this.sound.add("bgm", {
      loop: true,
      volume: 0.5, // adjust to your liking
    });
    this.bgm.play();
    const gameWidth = this.sys.game.config.width;
    const gameHeight = this.sys.game.config.height;
    new MuteButton(this, 0, 0 );
    const isMobile =
      this.sys.game.device.os.android || this.sys.game.device.os.iOS;
    if (isMobile) {
      this.createMobileControls();
    }
    this.score = 0;

    this.scoreText = this.add
      .text(200, 10, "Score: 0", {
        fontSize: "24px",
        fill: "#FFFFFF",
        fontFamily: "NormalSans",
      })
      .setScrollFactor(0).setDepth(100);

    this.player = new Player(this, gameWidth / 2, gameHeight * 0.75);

    this.cursors = this.input.keyboard.addKeys("W,A,S,D");
    this.enemies = this.physics.add.group();
    this.enemies = this.physics.add.group({ runChildUpdate: true });

    // REPLACE the enemy collider so there is only ONE binding and ONE handler
    if (this.playerEnemyCollider) this.playerEnemyCollider.destroy();
    this.playerEnemyCollider = this.physics.add.collider(
      this.player,
      this.enemies,
      (player, enemy) => {
        // Null-safe: let each enemy decide stomp/damage/etc.
        enemy?.onPlayerCollide?.(player);
      }
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
    //map creation
    this.mapData = createMap(this, this.player);
    initializePlatforms(this, this.player);
    setupCoins(this);
    setupDeathBar(this, { offset: 40, barHeight: 20 });
    this.enemiesPlatformsCollider = this.physics.add.collider(
      this.enemies,
      this.platforms,
      null,
      (enemy /*, platform */) => {
        return enemy?.constructor?.TYPE !== "ghost"; // block everyone except ghosts
      },
      this
    );

    // Create enemies group if you don't already:
    this.enemies =
      this.enemies || this.physics.add.group({ runChildUpdate: true });

    // Simple free-roaming ghost spawner
    // Simple free-roaming ghost spawner
this.time.addEvent({
  delay: 1200,
  loop: true,
  callback: () => {
    // 1) establish difficulty t
    const score = this.score ?? 0;
    const t = difficultyT(score); 

    // 2) Max ghosts based on difficulty:
    const maxGhosts = t >= 0.65 ? 2 : 1;

    // 3) Count active ghosts in the enemies group
    const activeGhosts = this.enemies
      .getChildren()
      .filter((e) => e?.constructor?.TYPE === "ghost" && e.active);

    if (activeGhosts.length >= maxGhosts) return;

    // 4) Spawn just above the camera, somewhat random X
    const cam = this.cameras.main;
    const w = this.scale.width;
    const x = Phaser.Math.Between(24, w - 24);
    const y = cam.worldView.y - Phaser.Math.Between(80, 160);

    if (this._positionIsInsidePlatform(x, y)) return;

    if (
      Math.abs(this.player.x - x) < 16 &&
      Math.abs(this.player.y - y) < 16
    )
      return;

    // 5) Create and add to the enemies group
    const g = new Ghost(this, x, y);
    this.enemies.add(g);
  },
});

this.upgrades = new UpgradeManager(this, this.player, this.platforms);

  }
  update() {
    this.scoreText.setText(`Score: ${this.score}`);
    // this.mapData.background.tilePositionY = this.cameras.main.scrollY;
    updateMap(this.mapData, this.cameras.main);
    updateBackground(this.bgData, this.cameras.main);
    this.player.update();
    // Compute where we'd like the camera if it were allowed to move both ways
    const target = this.player.y - this.followOffsetY;
    spawnPlatforms(this, this.player);
    // Only allow the camera to move UP (remember: smaller scrollY = higher)
    if (target < this.minScrollY) {
      this.minScrollY = target;
    }
    this.cameras.main.scrollY = this.minScrollY; // never increases
    updateCoins(this, this.time.now);
    updateDeathBar(this);
  }
  _positionIsInsidePlatform(x, y) {
    let inside = false;
    this.platforms.getChildren().forEach((p) => {
      if (!p?.active) return;
      const halfW = (p.displayWidth ?? p.body?.width ?? 0) / 2;
      const halfH = (p.displayHeight ?? p.body?.height ?? 0) / 2;
      if (
        x >= p.x - halfW - 2 &&
        x <= p.x + halfW + 2 &&
        y >= p.y - halfH - 2 &&
        y <= p.y + halfH + 2
      ) {
        inside = true;
      }
    });
    return inside;
  }

  gameOver() {
    this.scene.stop("GameScene");
    this.scene.start("GameOverScene", { score: this.score });
  }

  spawnEnemy() {
    const gameWidth = this.sys.game.config.width;
    const x = Phaser.Math.Between(50, gameWidth - 50);
    const y = this.cameras.main.scrollY - 50;
    new Enemy(this, x, y);
  }
  createMobileControls() {
    const { width, height } = this.sys.game.canvas;

    this.controls = { left: false, right: false, jump: false };

    // LEFT button
    this.leftButton = this.add
      .image(80, height - 80, "arrow_button")
      .setInteractive()
      .setScrollFactor(0)
      .setScale(1.5)
      .setPipeline("TextureTintPipeline")
      .setRotation(Math.PI / -2)
      .setDepth(9999)
      .setAlpha(0.5);
    this.leftButton.on("pointerdown", () => (this.controls.left = true));
    this.leftButton.on("pointerup", () => (this.controls.left = false));
    this.leftButton.on("pointerout", () => (this.controls.left = false));

    // JUMP button
    this.jumpButton = this.add
      .image(200, height - 80, "arrow_button")
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(9999)
      .setAlpha(0.5);
    this.jumpButton.on("pointerdown", () => (this.controls.up = true));
    this.jumpButton.on("pointerup", () => (this.controls.up = false));
    this.jumpButton
      .on("pointerout", () => (this.controls.up = false))
      .setScale(1.5)
      .setPipeline("TextureTintPipeline");

    // RIGHT button
    this.rightButton = this.add
      .image(
        this.jumpButton.x + this.jumpButton.width + 50,
        height - 80,
        "arrow_button"
      )
      .setInteractive()
      .setScrollFactor(0)
      .setScale(1.5)
      .setPipeline("TextureTintPipeline")
      .setRotation(Math.PI / 2)
      .setDepth(9999)
      .setAlpha(0.5);
    this.rightButton.on("pointerdown", () => (this.controls.right = true));
    this.rightButton.on("pointerup", () => (this.controls.right = false));
    this.rightButton.on("pointerout", () => (this.controls.right = false));
  }
  resetGame() {
    // Defensive destroy: no `.clear()` because physics may be gone
    if (this.platforms) {
      try {
        this.platforms.getChildren().forEach((child) => child.destroy());
        this.platforms.destroy(true);
      } catch (e) {
        console.warn("Failed to destroy platforms group:", e);
      }
      this.platforms = null;
    }

    if (this.coins) {
      try {
        this.coins.clear(true, true);
      } catch {}
      this.coins = null;
    }

    if (this.enemies) {
      try {
        this.enemies.clear(true, true);
      } catch {}
      this.enemies = null;
    }

    if (this.springs) {
      try {
        this.springs.clear(true, true);
      } catch {}
      this.springs = null;
    }
  }
}
