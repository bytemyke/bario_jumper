export default class MuteButton extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, "mute", 0);
    scene.isMuted = false;

    scene.muteButton = scene.add
      .image(40, 40, "music_on") // start with ON
      .setScrollFactor(0)
      .setInteractive()
      .setScale(2); // scale up if pixel art

    // handle click
    scene.muteButton.on("pointerdown", () => {
      scene.isMuted = !scene.isMuted;

      // mute/unmute global sound
      scene.sound.mute = scene.isMuted;

      // swap texture
      scene.muteButton.setTexture(scene.isMuted ? "music_off" : "music_on");
    });
  }
}
