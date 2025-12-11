import Phaser from "phaser";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data.score || 0;
  }

  create() {
    const { width, height } = this.sys.game.canvas;

    // GAME OVER typing effect
    this.gameOverText = this.add
      .text(width / 2, 50, "", {
        fontSize: "90px",
        color: "#ff0000",
        fontStyle: "bold",
        fontFamily: "Monogram",
      })
      .setOrigin(0.5);

    const msg = "GAME OVER";
    let i = 0;
    this.time.addEvent({
      delay: 150,
      repeat: msg.length - 1,
      callback: () => {
        this.gameOverText.text += msg[i];
        i++;
      },
    });

    // Score text (flashing)
    this.scoreText = this.add
      .text(width / 2, 160, `Score: ${this.finalScore}`, {
        fontSize: "70px",
        color: "#ffffffff",
        fontStyle: "bold",
        fontFamily: "Monogram",
      })
      .setOrigin(0.5);

    // Flash animation
    this.scoreFlashTween = this.tweens.add({
      targets: this.scoreText,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // --- BUTTON CREATOR ---
    const makeButton = (y, label, callback, color = "#ffffff") => {
      const button = this.add
        .image(width / 2, y, "idle_button")
        .setOrigin(0.5)
        .setScale(1)
        .setInteractive({ useHandCursor: true });
      const text = this.add
        .text(width / 2, y - 10, label, {
          fontSize: "30px",
          color,
          fontFamily: "Monogram",
          // backgroundColor: "#333",
          padding: { left: 16, right: 16, top: 10, bottom: 10 },
        })
        .setOrigin(0.5);

      button.on("pointerdown", callback);
      button.on("pointerover", () => {
        button.setTexture("click_button");
      });

      button.on("pointerout", () => {
        button.setTexture("idle_button");
      });
      return button;
    };
    let startY = height / 2 - 30;
    // 🎮 Try Again
    makeButton(startY, "Play Again", () => {
      if (this.scene.isActive("GameScene")) {
        this.scene.stop("GameScene");
      }
      this.scene.start("GameScene");
    });

    // 🐦 Share on Twitter (text only)
    makeButton(
      startY + 100,
      "Share on Twitter",
      () => {
        const text = encodeURIComponent(
          `I got a score of ${this.finalScore} in Bario Jumper!`
        );
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, "_blank");
      },
      "#340ee1ff"
    );

    // 🌐 Share on Farcaster (text only)
    makeButton(
      startY + 200,
      "Share on Farcaster",
      () => {
        const text = encodeURIComponent(
          `I got a score of ${this.finalScore} in Bario Jumper!`
        );
        const url = `https://warpcast.com/~/compose?text=${text}`;
        window.open(url, "_blank");
      },
      "#7e02f3ff"
    );

    // 📸 Save High Score Image
    makeButton(startY + 300, "Save High Score IMG", () => {
      this.saveHighScoreImage();
    });
  }
  async saveHighScoreImage() {
    // Stop flashing & ensure visibility
    this.scoreFlashTween.pause();
    this.scoreText.alpha = 1;
    const text = this.scoreFlashTween;
    await new Promise((resolve) => setTimeout(resolve, 50)); // small delay in case frame needs update

    const canvas = this.sys.game.canvas;

     this.game.renderer.snapshot(function (image) {
      // 'image' is an HTMLImageElement containing the screenshot
      // You can then process or save this image, for example:
      // document.body.appendChild(image); // Append to the DOM for display

      // To download the image:
      const link = document.createElement("a");
      link.download = "bario_jumper_high_score.png";
      link.href = image.src;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      text.resume();
    });
  }
}
