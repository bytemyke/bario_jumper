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

    // Empty text for typing effect (red)
    this.gameOverText = this.add
      .text(width / 2, height / 2 - 120, "", {
        fontSize: "48px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Score text (flashing)
    this.scoreText = this.add
      .text(width / 2, height / 2 - 40, `Score: ${this.finalScore}`, {
        fontSize: "36px",
        color: "#87CEFA",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Tween for flashing score (slower: 1s)
    this.tweens.add({
      targets: this.scoreText,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Restart prompt (hidden until delay is over)
    this.promptText = this.add
      .text(
        width / 2,
        height / 2 + 80,
        "Tap screen or press any key to restart",
        {
          fontSize: "20px",
          color: "#ffffff",
          wordWrap: { width: width - 40 },
        }
      )
      .setOrigin(0.5);
    this.promptText.setVisible(false);

    // --- Typing animation for GAME OVER ---
    const message = "GAME OVER";
    let i = 0;
    this.time.addEvent({
      delay: 150,
      repeat: message.length - 1,
      callback: () => {
        this.gameOverText.text += message[i];
        i++;
      },
    });

    const restartGame = () => {
      // If GameScene is active, stop it (triggers its shutdown)
      if (
        this.scene.isActive("GameScene") ||
        this.scene.isSleeping("GameScene")
      ) {
        try {
          this.scene.stop("GameScene");
        } catch (e) {
          console.warn(e);
        }
      }

      // Start a fresh GameScene instance
      this.scene.start("GameScene");

      // Stop GameOverScene if you want
      this.scene.stop("GameOverScene");
    };

    // enable input after your 5s delay:
    this.time.delayedCall(5000, () => {
      this.promptText.setVisible(true);

      this.input.keyboard.once("keydown", restartGame);
      this.input.once("pointerdown", restartGame);
    });
  }
}
