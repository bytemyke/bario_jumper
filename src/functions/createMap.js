// createMap: make sure you RETURN wallHeight
export function createMap(scene, player, { debug = false } = {}) {
  const map = scene.make.tilemap({ key: "tilemap" });
  const gameHeight = scene.game.config.height;
  const originY = gameHeight / 4;

  const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");

  const ground = map.createLayer("ground", tileset, 0, originY);
  const wall = map.createLayer("wall", tileset, 0, originY);

  // height in pixels for one wall layer
  const wallHeight = wall.layer.height * wall.layer.baseTileHeight;
  //old background method
  // const background = map.createLayer("background", tileset, 0, originY);
  // background.setScrollFactor(1);
  // background.setDepth(-1);

  // new background method
  // const background = scene.add.tileSprite(0, 0, bgWidth, bgHeight, "backgroundTexture")
  // .setOrigin(0, 0)
  // .setScrollFactor(0) // stays relative to camera
  // .setDepth(-1);
  // second wall stacked directly above the first
  const wall2 = map.createLayer("wall2", tileset, 0, originY - wallHeight);

  const collisionLayers = [ground, wall, wall2];
  collisionLayers.forEach((layer) => {
    layer.setScrollFactor(1);
    layer.setDepth(1);
    layer.setCollisionByExclusion([-1]);
  });

  scene.collideWithMap = (sprite) => {
    if (!sprite.body) {
      return scene.time.delayedCall(0, () => scene.collideWithMap(sprite));
    }
    collisionLayers.forEach((layer) =>
      scene.physics.add.collider(sprite, layer)
    );
  };

  if (player) scene.collideWithMap(player);

  if (debug) {
    scene.physics.world.createDebugGraphic();
    const g = scene.add.graphics().setAlpha(0.7);
    collisionLayers.forEach((layer) => {
      layer.renderDebug(g, {
        tileColor: null,
        collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
        faceColor: new Phaser.Display.Color(40, 39, 37, 255),
      });
    });
  }

  return { map, ground, wall, wall2, wallHeight, originY };
}

// Call this every frame from your Scene.update:
// updateMap(mapData, this.cameras.main);
export function updateMap(mapData, camera) {
  const { wall, wall2, wallHeight } = mapData;
  const camTop = camera.scrollY;
  const camBottom = camTop + camera.height;

  // adjust this if seam is bigger
  const GAP_FIX = 1; 

  const topLayer = wall.y < wall2.y ? wall : wall2;
  const bottomLayer = topLayer === wall ? wall2 : wall;

  // MOVING UP
  if (bottomLayer.y > camBottom) {
    bottomLayer.y = topLayer.y - wallHeight + GAP_FIX;
  }

  // MOVING DOWN
  if (topLayer.y + wallHeight < camTop) {
    topLayer.y = bottomLayer.y + wallHeight - GAP_FIX;
  }
}
