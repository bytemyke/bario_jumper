export function createMap(scene, player, { debug = false } = {}) {
  const map = scene.make.tilemap({ key: "tilemap" });
  const gameHeight = scene.game.config.height;
  const originY = Math.floor(gameHeight / 2 - 150);

  const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");

  // create layers at same y offset
  const ground = map.createLayer("ground", tileset, 0, originY);
  const leftWall = map.createLayer("leftWall", tileset, 0, originY);
  const rightWall = map.createLayer("rightWall", tileset, 0, originY);
  const background = map.createLayer("background", tileset, 0, originY);

  const collisionLayers = [ground, leftWall, rightWall];

  // mark all non-empty tiles as collidable (works without tile property)
  collisionLayers.forEach((layer) => {
    layer.setCollisionByExclusion([-1]);
  });

  // expose helper to attach colliders for any sprite (player, enemies, mushrooms...)
  scene.collideWithMap = (sprite) => {
    // make sure sprite has a body
    if (!sprite.body) {
      // if body not ready yet, try next tick
      return scene.time.delayedCall(0, () => scene.collideWithMap(sprite));
    }
    collisionLayers.forEach((layer) =>
      scene.physics.add.collider(sprite, layer)
    );
  };

  // attach player immediately (player is available at map creation in your code)
  if (player) scene.collideWithMap(player);

  // visual/debug helpers (enable by passing { debug: true })
  if (debug) {
    scene.physics.world.createDebugGraphic();
    const debugGraphics = scene.add.graphics().setAlpha(0.7);
    collisionLayers.forEach((layer) => {
      layer.renderDebug(debugGraphics, {
        tileColor: null, // non-colliding tiles
        collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
        faceColor: new Phaser.Display.Color(40, 39, 37, 255),
      });
    });
  }

  background.setDepth(-1);
  // background.setAlpha(0.75);
  ground.setDepth(1);
  leftWall.setDepth(1);
  rightWall.setDepth(1);

  // store map and layers on scene for debugging access if you want
  scene.mapData = { map, ground, leftWall, rightWall, background, originY };

  return { map, ground, leftWall, rightWall, background };
}
