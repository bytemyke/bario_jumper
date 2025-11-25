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
      .text(width / 2, height / 2 - 120, "", {
        fontSize: "48px",
        color: "#ff0000",
        fontStyle: "bold",
        fontFamily: "NormalSans",
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
      .text(width / 2, height / 2 - 40, `Score: ${this.finalScore}`, {
        fontSize: "36px",
        color: "#87CEFA",
        fontStyle: "bold",
        fontFamily: "NormalSans",
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
      const b = this.add
        .text(width / 2, y, label, {
          fontSize: "24px",
          color,
          fontFamily: "NormalSans",
          backgroundColor: "#333",
          padding: { left: 16, right: 16, top: 10, bottom: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      b.on("pointerdown", callback);
      return b;
    };

    // 🎮 Try Again
    makeButton(height / 2 + 40, "Try Again", () => {
      if (this.scene.isActive("GameScene")) {
        this.scene.stop("GameScene");
      }
      this.scene.start("GameScene");
    });

    // 🐦 Share on Twitter (text only)
    makeButton(
      height / 2 + 100,
      "Share on Twitter",
      () => {
        const text = encodeURIComponent(
          `I got a score of ${this.finalScore} in Bario Jumper!`
        );
        const url = `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, "_blank");
      },
      "#1DA1F2"
    );

    // 🌐 Share on Farcaster (text only)
    makeButton(
      height / 2 + 160,
      "Share on Farcaster",
      () => {
        const text = encodeURIComponent(
          `I got a score of ${this.finalScore} in Bario Jumper!`
        );
        const url = `https://warpcast.com/~/compose?text=${text}`;
        window.open(url, "_blank");
      },
      "#8A2BE2"
    );

    // 📸 Save High Score Image
    makeButton(height / 2 + 220, "Save High Score IMG", () => {
      this.saveHighScoreImage();
    });
  }
  async saveHighScoreImage() {
    // Stop flashing & ensure visibility
    this.scoreFlashTween.pause();
    this.scoreText.alpha = 1;

    await new Promise((resolve) => setTimeout(resolve, 50)); // small delay in case frame needs update

    const canvas = this.sys.game.canvas;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bario_jumper_high_score.png";
      a.click();
      URL.revokeObjectURL(url);

      // Resume flashing
      this.scoreFlashTween.resume();
    }, "image/png");
  }
}
