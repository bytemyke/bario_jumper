import Phaser from "phaser";

export default class InstructionsScene extends Phaser.Scene {
  constructor() {
    super("InstructionsScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65);

    this.add
      .text(width / 2, 80, "How to Play", {
        fontSize: "28px",
        color: "#ffffff",
        fontFamily: "NormalSans",
      })
      .setOrigin(0.5);

    const instructionLines = [
      "WASD (PC) \n BUTTONS (Mobile):",
      "- Collect coins to increase your score",
      "- Avoid enemies and falling off platforms",
      "- Springs launch you higher",
      "- Mushrooms can give you an extra life",
    ];

    this.add
      .text(width / 2, height / 2, instructionLines.join("\n"), {
        fontSize: "13px",
        color: "#ffffff",
        fontFamily: "NormalSans",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 80, "ESC or click to return", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "NormalSans",
      })
      .setOrigin(0.5);

    const returnToMenu = () => {
      this.scene.start("MenuScene");
    };

    this.input.keyboard.once("keydown-ESC", returnToMenu);
    this.input.keyboard.once("keydown-M", returnToMenu);
    this.input.once("pointerdown", returnToMenu);
  }
}

