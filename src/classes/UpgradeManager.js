import Mushroom from "../sprites/upgrades/Mushroom";
import Flower from "../sprites/upgrades/Flower";

export default class UpgradeManager {
  constructor(scene, player, platforms) {
    this.scene = scene;
    this.player = player;
    this.platforms = platforms;

    this.upgrades = this.scene.physics.add.group();

    // Handle player overlap with upgrades
    this.scene.physics.add.overlap(
      this.player,
      this.upgrades,
      this.handleCollision,
      null,
      this
    );

    // Spawn timer
    // this.scene.time.addEvent({
    //   delay: 10000, // check every 10s
    //   loop: true,
    //   callback: () => this.trySpawn(),
    // });
    this.spawnMushroom();
  }

  trySpawn() {
    // const chance = Phaser.Math.Between(1, 100);
    // if (this.player.current_mode === "mini" && chance < 30) {
    //   this.spawnMushroom();
    // } else if (this.player.current_mode === "big" && chance < 15) {
    //   this.spawnFlower();
    // }
  }

  spawnMushroom() {
    const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
    const mushroom = new Mushroom(this.scene, x, 0);
    this.upgrades.add(mushroom);
    this.scene.physics.add.collider(mushroom, this.platforms);
  }

  spawnFlower() {
    const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
    const flower = new Flower(this.scene, x, 0);
    this.upgrades.add(flower);
    this.scene.physics.add.collider(flower, this.platforms);
  }

  handleCollision(player, upgrade) {
    if (upgrade.texture.key === "mushroom" && player.current_mode === "mini") {
      this.applyUpgrade("big", upgrade);
    } else if (
      upgrade.texture.key === "flower" &&
      player.current_mode === "big"
    ) {
      this.applyUpgrade("fire", upgrade);
    }
  }

  applyUpgrade(newMode, upgrade) {
    upgrade.destroy();
    this.player.changeMode(newMode);
  }

  handleDamage() {
    this.scene.physics.world.pause();

    if (this.player.current_mode === "fire") {
      this.player.anims.play("hurt");
      this.scene.time.delayedCall(1000, () => {
        this.player.changeMode("big");
        this.scene.physics.world.resume();
      });
    } else if (this.player.current_mode === "big") {
      this.player.anims.play("hurt");
      this.scene.time.delayedCall(1000, () => {
        this.player.changeMode("mini");
        this.scene.physics.world.resume();
      });
    } else {
      this.player.die();
      // you can trigger game over here
    }
  }
}
