import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.add
      .text(200, 250, "DOODLE CLONE", {
        fontSize: "28px",
        color: "#000",
      })
      .setOrigin(0.5);

    this.add
      .text(200, 320, "Press SPACE to Start", {
        fontSize: "16px",
        color: "#000",
      })
      .setOrigin(0.5);

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("GameScene");
    });
  }
}
