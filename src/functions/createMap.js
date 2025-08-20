export function createMap(scene, player){
    // Create the tilemap
    const map = scene.make.tilemap({ key: "tilemap" });
    const gameHeight = scene.game.config.height;
    const originHeight =  gameHeight / 2 - 150;
    console.log(originHeight)
    const tileset = map.addTilesetImage("Ground-and-Ceiling", "gandcTiles");
    const ground = map.createLayer("ground", tileset, 0, originHeight); 
    const leftWall = map.createLayer("leftWall", tileset, 0, originHeight);
    const rightWall = map.createLayer("rightWall", tileset, 0, originHeight);
    const background = map.createLayer("background", tileset, 0, originHeight);

    setCollisions(ground, player,scene);
    setCollisions(leftWall, player,scene);
    setCollisions(rightWall, player,scene);
    background.setDepth(0);
    ground.setDepth(1);
    leftWall.setDepth(1);
    rightWall.setDepth(1)
    return {map: map, ground: ground, leftWall: leftWall, rightWall: rightWall, background: background};
}

function setCollisions(layer, player,scene){
    layer.setCollisionByExclusion([-1])
    layer.setCollisionByProperty({ collides: true });
    scene.physics.add.collider(player, layer);
}