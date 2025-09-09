import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import MenuScene from "./scenes/MenuScene";
import GameOverScene from "./scenes/GameOverScene";
import PreloadScene from "./scenes/PreloadScene";

// const config = {
//   type: Phaser.AUTO,
//   parent: "phaser-game",
//   width: 720/2, // base width
//   height: 1280/2, // base height
//   backgroundColor: "#87CEEB",
//   physics: {
//     default: "arcade",
//     arcade: {
//       gravity: { y: 1000 },
//       debug: false,
//     },
//   },
//   scale: {
//     mode: Phaser.Scale.FIT,
//     autoCenter: Phaser.Scale.CENTER_BOTH, // center on screen
//   },
//   scene: [PreloadScene, MenuScene, GameScene, GameOverScene],
// };

const vh = window.innerHeight * 0.9;
const config = {
  type: Phaser.AUTO,
  width: "368",
  height: "672",
  parent: "game-container",
  backgroundColor: "#000000",
  canvasStyle: "border: 5px solid white; border-radius: 10px;",
  resolution: 10, // the higher the better (but certainly slower)
  max: {
    width: 800,
    height: vh,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  scene: [PreloadScene, MenuScene, GameScene, GameOverScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
  },
};
const game = new Phaser.Game(config);

export default game;
