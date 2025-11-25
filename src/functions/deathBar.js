// deathBar.js

export function setupDeathBar(scene, { offset = 40, barHeight = 20 } = {}) {
  const { width, height } = scene.scale;

  // Visible red rectangle below screen
  const bar = scene.add.rectangle(
    width / 2,
    height + offset,
    width,
    barHeight,
    0xff0000
  );
  bar.setOrigin(0.5, 1);
  bar.setDepth(9999);

  // Add static physics body
  scene.physics.add.existing(bar, true);

  // Safety: disable gravity manually
  if (bar.body) {
    bar.body.allowGravity = false;
  }
  bar.hasCollided = false;
  scene.deathBar = bar;

  // Collision: player + bar
  scene.physics.add.collider(scene.player, bar, () => {
    if (bar.hasCollided) return; // only trigger once
    const posX = 0,
      posY = 0;
    const { width, height } = scene.sys.game.scale.gameSize;
    const color = 0xff0000;
    const alpha = 0.5;
    const darkScreen = scene.add.rectangle(
      posX,
      posY,
      width,
      height+100,
      color,
      alpha
    );
    darkScreen.setOrigin(0, 0).setDepth(9999);
    // scene.cameras.main.setTintFill(true);
    bar.hasCollided = true;
    console.log("over");
    scene.player.die();
  });
}

export function updateDeathBar(scene, { offset = 40 } = {}) {
  const cam = scene.cameras.main;
  const { height } = scene.scale;
  const bar = scene.deathBar;
  if (!bar) return;

  // Move the bar to follow the camera (slightly below screen)
  const newY = cam.scrollY + height + offset;
  bar.y = newY;

  // Sync static body manually, but avoid world bound growth
  if (bar.body) {
    bar.body.position.y = newY - bar.displayHeight * bar.originY;
  }
}
