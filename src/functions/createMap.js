// createMap: make sure you RETURN wallHeight
export function createMap(scene, player, { debug = false } = {}) {
  const map = scene.make.tilemap({ key: "tilemap" });
  const gameHeight = scene.game.config.height;
  const originY = gameHeight / 4;

  const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");

  const ground = map.createLayer("ground", tileset, 0, originY);
  const wall = map.createLayer("wall", tileset, 0, originY);
  //create background
  // Create 2 stacked background images
const bgTexture = scene.textures.get("bgCastle").getSourceImage();
const bgHeight = bgTexture.height;
const bgWidth = bgTexture.width;
//Test against this

// Create 3 backgrounds stacked vertically
const bgAlpha = 0.5; // 0 = fully transparent, 1 = fully opaque

const bg1 = scene.add.image(0, 0, "bgCastle")
  .setOrigin(0, 0)
  .setScrollFactor(1)
  .setDepth(-10)
  .setAlpha(bgAlpha);

const bg2 = scene.add.image(0, -bgHeight, "bgCastle")
  .setOrigin(0, 0)
  .setScrollFactor(1)
  .setDepth(-10)
  .setAlpha(bgAlpha);

const bg3 = scene.add.image(0, -bgHeight * 2, "bgCastle")
  .setOrigin(0, 0)
  .setScrollFactor(1)
  .setDepth(-10)
  .setAlpha(bgAlpha);


// Store data for updates
scene.bgData = { backgrounds: [bg1, bg2, bg3], bgHeight };



  // height in pixels for one wall layer
  const wallHeight = wall.layer.height * wall.layer.baseTileHeight;
  if (!wall) {
    console.warn('Tilemap layer "wall" missing; skipping wall parallax.');
    return 0; // or whatever your caller expects
  }

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

export function updateBackground(bgData, camera) {
  const { backgrounds, bgHeight } = bgData;
  const camTop = camera.scrollY;
  const camBottom = camTop + camera.height;
  const GAP_FIX = 1;

  // Sort by y position (top to bottom)
  backgrounds.sort((a, b) => a.y - b.y);

  const topBg = backgrounds[0];
  const midBg = backgrounds[1];
  const bottomBg = backgrounds[2];

  // Moving UP — bottom goes above top
  if (bottomBg.y > camBottom) {
    bottomBg.y = topBg.y - bgHeight + GAP_FIX;
  }

  // Moving DOWN — top goes below bottom
  if (topBg.y + bgHeight < camTop) {
    topBg.y = bottomBg.y + bgHeight - GAP_FIX;
  }
}


