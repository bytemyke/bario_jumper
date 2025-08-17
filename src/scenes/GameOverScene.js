import Phaser from "phaser";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    this.add.text(200, 250, "GAME OVER", {
      fontSize: "28px",
      color: "#000",
    }).setOrigin(0.5);

    this.add.text(200, 300, "Score: " + this.finalScore, {
      fontSize: "20px",
      color: "#000",
    }).setOrigin(0.5);

    this.add.text(200, 360, "Press SPACE to Restart", {
      fontSize: "16px",
      color: "#000",
    }).setOrigin(0.5);

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("MenuScene");
    });
  }
}
