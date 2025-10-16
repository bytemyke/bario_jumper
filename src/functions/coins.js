// coins.js
export function setupCoins(scene) {
  // Animation (safe to call multiple times)
  if (!scene.anims.exists("coinSpin")) {
    scene.anims.create({
      key: "coinSpin",
      frames: scene.anims.generateFrameNumbers("coin", { start: 0, end: 19 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  // Group setup
  scene.coins = scene.physics.add.group({
    classType: Phaser.Physics.Arcade.Sprite,
    runChildUpdate: false,
  });
    // Overlap — always call collectCoinImmediately
  scene.physics.add.collider(
    scene.player,
    scene.coins,
    (player, coin) => collectCoinImmediately(scene, player, coin),
  );

  // Spawn timing
  scene.coinCooldown = 1500;
  scene.lastCoinSpawn = 0;
  scene.maxCoinsOnScreen = 2;
}

function spawnCoin(scene) {
  const gameWidth = scene.sys.game.config.width;
  const camera = scene.cameras.main;

  // Limit visible coins
  const camTop = camera.scrollY;
  const camBottom = camTop + camera.height;
  const visibleCoins = scene.coins.getChildren().filter(
    (c) => c.active && c.y > camTop && c.y < camBottom
  );
  if (visibleCoins.length >= scene.maxCoinsOnScreen) return;

  // Random position above the camera
  const x = Phaser.Math.Between(50, gameWidth - 50);
  const y = camera.scrollY - Phaser.Math.Between(150, 300);

  const coin = scene.physics.add.sprite(x, y, "coin", 0);
  scene.coins.add(coin);

  coin.setDepth(10).setScale(0.08).setScrollFactor(1).setAlpha(0.9);
  coin.body.setAllowGravity(false);
  coin.play("coinSpin");

  // Tight hitbox
  // const w = coin.displayWidth * 1;
  // const h = coin.displayHeight * 1;
  // coin.body.setSize(w, h);
  // coin.body.setOffset((coin.displayWidth - w) / 2, (coin.displayHeight - h) / 2);

  // Gentle drift (doesn’t interfere with anim)
  const drift = Phaser.Math.Between(10, 25);
  const dur = Phaser.Math.Between(1500, 2500);
  const tween = scene.tweens.add({
    targets: coin,
    x: coin.x + (Math.random() < 0.5 ? -drift : drift),
    duration: dur,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });

  coin._driftTween = tween;
  coin.on("destroy", () => {
    if (coin._driftTween) coin._driftTween.remove();
  });
}

function collectCoinImmediately(scene, player, coin) {
  console.log('test')
  // Immediately remove tween and coin
  if (coin._driftTween) coin._driftTween.remove();
  coin.disableBody(true, true);
  coin.destroy(true);

  // Update score right away
  scene.score = (scene.score || 0) + 10;
  if (scene.scoreText?.setText) {
    scene.scoreText.setText("Score: " + scene.score);
  }

  // Optional: sound
    scene.sound.play("coin_sfx");
}

export function updateCoins(scene, time) {
  const camera = scene.cameras.main;
  const camBottom = camera.scrollY + camera.height;

  // Clean up old coins below camera
  scene.coins.children.each((coin) => {
    if (coin.active && coin.y > camBottom + 150) {
      if (coin._driftTween) coin._driftTween.remove();
      coin.destroy();
    }
  });

  // Spawn coins randomly with cooldown
  if (time > scene.lastCoinSpawn + scene.coinCooldown) {
    if (Phaser.Math.Between(0, 100) < 40) spawnCoin(scene);
    scene.lastCoinSpawn = time;
  }
}
