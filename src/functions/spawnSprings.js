// PSEUDOCODE: Decide whether to attach a spring to a just-created platform and place it.
import Spring from "../sprites/Spring";

/**
 * maybeAttachSpring(scene, player, platform, { isEssential, prevEssential })
 * Rules:
 *  - Only on "basic" 3-block platforms.
 *  - If prevEssential provided, choose far/middle side relative to the lane.
 *  - Optionals may get springs too, but without far/middle constraint.
 */
export function maybeAttachSpring(scene, player, platform, opts = {}) {
  // PSEUDOCODE: Enforce "basic 3-block only".
  const isThreeBlockBasic =
    (platform?.isBasic === true) && ((platform?.blocks ?? 1) === 3);
  if (!isThreeBlockBasic) return;

  // PSEUDOCODE: Avoid double-placing on the same platform.
  if (platform.spring) return;

  // PSEUDOCODE: Decide X offset over the platform: middle or 'far' from previous essential.
  const width = platform.displayWidth || platform.body?.width || 48;
  let localX = 0; // center by default

  if (opts.isEssential && opts.prevEssential) {
    const prev = opts.prevEssential;
    // If previous essential is to the left, place on the far-right third; else far-left third.
    const prevLeft = prev.x < platform.x;
    localX = prevLeft ? +(width * 0.25) : -(width * 0.25); // approx 1/4 in from edge
  } else {
    // Optionals or first rung: favor dead-center
    localX = 0;
  }

  // PSEUDOCODE: Compute world position where the spring sits flush on top of the platform.
  const x = platform.x + localX;
  const y = platform.y; // our Spring uses origin (0.5, 1), so Y = top surface

  // PSEUDOCODE: Create & store.
  const spring = new Spring(scene, x, y);
  platform.spring = spring;

  // PSEUDOCODE: Collider: bounce only when player is falling onto it (one-way feel).
  scene.physics.add.overlap(scene.player || player, spring, (plr, spr) => {
    const body = plr.body;
    if (!body) return;

    // Only trigger if player is moving downward / feet region intersects from above.
    const descending = body.velocity.y > -30; // a little leeway; treat near-zero as down
    const aboveTop   = (plr.y <= spr.y + 2);
    if (!descending || !aboveTop) return;

    // PSEUDOCODE: Fire hooks so Player can switch to “spring mode” animation externally.
    scene.events.emit("spring:start", { player: plr, spring: spr });

    // PSEUDOCODE: Play the visual bounce; when done, signal end hook.
    spr.playBounce(() => {
      scene.events.emit("spring:end", { player: plr, spring: spr });
    });

    // PSEUDOCODE: Apply a strong vertical launch — actual “ignore-platforms” logic should live in Player.
    body.setVelocityY(-900);
  }, null, scene);
}
