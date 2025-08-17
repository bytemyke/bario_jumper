import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import MenuScene from "./scenes/MenuScene";
import GameOverScene from "./scenes/GameOverScene";
import PreloadScene from "./scenes/PreloadScene";
const config = {
  type: Phaser.AUTO,
  parent: "phaser-game",
  width: 720, // base width
  height: 1280, // base height
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH, // center on screen
  },
  scene: [PreloadScene, MenuScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);

export default game;
