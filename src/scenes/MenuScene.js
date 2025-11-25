import Phaser from "phaser";
import MuteButton from "../sprites/MuteButton";
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    new MuteButton(this, 0, 0);
    const { width, height } = this.scale;

    const CastleSheetAnimKey = "barioCastleSheetLoop";
    if (!this.anims.exists(CastleSheetAnimKey)) {
      const texture = this.textures.get("barioCastleSheet");
      const frameTotal = texture.frameTotal;
      this.anims.create({
        key: CastleSheetAnimKey,
        frames: this.anims.generateFrameNumbers("barioCastleSheet", {
          start: 0,
          end: frameTotal - 1,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }

    const CastleSheetFrame = this.textures.getFrame("barioCastleSheet", 0);
    const frameWidth = CastleSheetFrame ? CastleSheetFrame.width : width;
    const CastleSheetScale = frameWidth ? width / frameWidth : 1;
    const CastleSheet = this.add
      .sprite(width / 2, 0, "barioCastleSheet")
      .setOrigin(0.5, 0)
      .setScale(CastleSheetScale)
      .play(CastleSheetAnimKey);

    const animationBottom = CastleSheet.getBounds().bottom;
    const sectionSpacing = 24;

    const title = this.add
      .text(width / 2, sectionSpacing, "Bario Jumper", {
        fontSize: "40px",
        color: "#ffffff",
        fontFamily: "NormalSans",
      })
      .setOrigin(0.5, 0)
      .setDepth(1);

    const startGame = () => {
      this.scene.start("GameScene");
    };

    const showInstructions = () => {
      this.scene.start("InstructionsScene");
    };

    const startText = this.add
      .text(width / 2, title.getBounds().bottom + sectionSpacing, "Start", {
        fontSize: "32px",
        color: "#ffffff",
        fontFamily: "NormalSans",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);

    const instructionsText = this.add
      .text(
        width / 2,
        startText.getBounds().bottom + sectionSpacing,
        "Instructions",
        {
          fontSize: "24px",
          color: "#ffffff",
          fontFamily: "NormalSans",
        }
      )
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    startText.on("pointerdown", startGame);
    startText.on("pointerover", () => startText.setStyle({ color: "#ffff88" }));
    startText.on("pointerout", () => startText.setStyle({ color: "#ffffff" }));

    instructionsText.on("pointerdown", showInstructions);
    instructionsText.on("pointerover", () =>
      instructionsText.setStyle({ color: "#ffff88" })
    );
    instructionsText.on("pointerout", () =>
      instructionsText.setStyle({ color: "#ffffff" })
    );

    // this.input.keyboard.once("keydown-SPACE", startGame);
    // this.input.keyboard.once("keydown-ENTER", startGame);
    // this.input.keyboard.once("keydown-I", showInstructions);
  }
}
