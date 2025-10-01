import Mushroom from "../sprites/upgrades/Mushroom";

export default class UpgradeManager {
  constructor(scene, player, platforms) {
    this.scene = scene;
    this.player = player;
    this.platforms = platforms;

    this.upgrades = this.scene.physics.add.group();
    this.scene.physics.add.collider(this.upgrades, this.platforms);
    // Handle player overlap with upgrades
    this.scene.physics.add.overlap(
      this.player,
      this.upgrades,
      this.handleCollision,
      null,
      this
    );
    this.spawnMushroom();
    // Spawn timer
    this.scene.time.addEvent({
      delay: 10000, // check every 10s
      loop: true,
      callback: () => this.trySpawn(),
    });
  }

  trySpawn() {
    const chance = Phaser.Math.Between(1, 100);

    if (this.player.current_mode === "mini" && chance < 30) {
      this.spawnMushroom();
    }
  }

  spawnMushroom() {
    const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
    const mushroom = new Mushroom(this.scene, x, 0);
    this.upgrades.add(mushroom);
  }

  handleCollision(player, upgrade) {
    if (upgrade.texture.key === "mushroom" && player.current_mode === "mini") {
      this.applyUpgrade("big", upgrade);
    }
  }

  applyUpgrade(newMode, upgrade) {
    upgrade.destroy();
    this.player.changeMode(newMode);
  }
}
