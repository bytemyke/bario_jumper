import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    const castleTexture = this.textures.get("bgCastle");
    const castleSource = castleTexture ? castleTexture.getSourceImage() : null;
    const castleWidth = castleSource ? castleSource.width : width;
    const castleHeight = castleSource ? castleSource.height : height;
    const castleScale = Math.max(width / castleWidth, height / castleHeight);
    this.add
      .image(width / 2, height / 2, "bgCastle")
      .setOrigin(0.5)
      .setScale(castleScale)
      .setTint(0xa8d8ff);

    const gradient = this.add.graphics();
    const palette = [0x3a2d6b, 0x54428e, 0x6b4ca5, 0x9068be];
    const stripeHeight = Math.ceil(height / palette.length);
    palette.forEach((color, index) => {
      gradient.fillStyle(color, 0.25);
      gradient.fillRect(0, index * stripeHeight, width, stripeHeight);
    });

    const scanlines = this.add.graphics();
    scanlines.fillStyle(0x000000, 0.08);
    for (let y = 0; y < height; y += 2) {
      scanlines.fillRect(0, y, width, 1);
    }

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

    const cartridgeAnimKey = "barioCartridgeLoop";
    if (!this.anims.exists(cartridgeAnimKey)) {
      const texture = this.textures.get("barioCartridge");
      const frameTotal = texture.frameTotal;
      this.anims.create({
        key: cartridgeAnimKey,
        frames: this.anims.generateFrameNumbers("barioCartridge", {
          start: 0,
          end: frameTotal - 1,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }

    const cartridgeFrame = this.textures.getFrame("barioCartridge", 0);
    const frameWidth = cartridgeFrame ? cartridgeFrame.width : width;
    const cartridgeScale = frameWidth ? width / frameWidth : 1;
    const cartridge = this.add
      .sprite(width / 2, 0, "barioCartridge")
      .setOrigin(0.5, 0)
      .setScale(cartridgeScale)
      .play(cartridgeAnimKey);

    const animationBottom = cartridge.getBounds().bottom;
    const sectionSpacing = 24;

    const title = this.add
      .text(width / 2, animationBottom + sectionSpacing, "Bario Jumper", {
        fontSize: "36px",
        color: "#ffffff",
        fontFamily: "NormalSans",
      })
      .setOrigin(0.5, 0);

    const startGame = () => {
      this.scene.start("GameScene");
    };

    const showInstructions = () => {
      this.scene.start("InstructionsScene");
    };

    const startText = this.add
      .text(
        width / 2,
        title.getBounds().bottom + sectionSpacing,
        "Start",
        {
          fontSize: "20px",
          color: "#ffffff",
          fontFamily: "NormalSans",
        }
      )
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    const instructionsText = this.add
      .text(
        width / 2,
        startText.getBounds().bottom + sectionSpacing,
        "Instructions",
        {
          fontSize: "18px",
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
