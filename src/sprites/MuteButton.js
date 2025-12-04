export default class MuteButton extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, "mute", 0);

    // --- cookie helpers ---
    const setCookie = (name, value, days) => {
      const d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
    };

    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    };

    // --- default state ---
    scene.isMuted = false;

    // --- check cookie for saved mute state ---
    const savedMute = getCookie("isMuted");
    if (savedMute === "true") {
      scene.isMuted = true;
      scene.sound.mute = true;
    }

    // your original button placement (unchanged)
    scene.muteButton = scene.add
      .image(18, 16, scene.isMuted ? "music_off" : "music_on") // respects saved state
      .setScrollFactor(0)
      .setInteractive()
      .setScale(1).setDepth(9999); // scale up if pixel art

    // handle click
    scene.muteButton.on("pointerdown", () => {
      scene.isMuted = !scene.isMuted;

      // mute/unmute global sound
      scene.sound.mute = scene.isMuted;

      // swap texture
      scene.muteButton.setTexture(scene.isMuted ? "music_off" : "music_on");

      // save state in cookie (30 days)
      setCookie("isMuted", scene.isMuted, 30);
    });
  }
}
