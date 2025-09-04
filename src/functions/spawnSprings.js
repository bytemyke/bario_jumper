// Decide whether to attach a spring to a just-created platform and place it.
import Spring from "../sprites/Spring";
//  Global spawn tuning — lower odds to make springs rarer, and cap how many can be visible at once.
const SPRING_CHANCE_ESSENTIAL = 0.45;  // was ~0.25; lower number => fewer springs on essential rungs
const SPRING_CHANCE_OPTIONAL  = 0.25;  // was ~0.15; lower number => fewer springs on optional rungs
const SPRING_MAX_IN_VIEW      = 8;     // hard cap: never show more than this many springs on screen
const SPRING_MIN_VERTICAL_GAP = 10; // try 120–180 for fewer, 80–100 for more


/**
 * maybeAttachSpring(scene, player, platform, { isEssential, prevEssential })
 * Rules:
 *  - Only on "basic" 3-block platforms.
 *  - If prevEssential provided, choose far/middle side relative to the lane.
 *  - Optionals may get springs too, but without far/middle constraint.
 */
export function maybeAttachSpring(scene, player, platform, opts = {}) {
  //  Enforce "basic 3-block only".
  const isThreeBlockBasic =
    (platform?.isBasic === true) && ((platform?.blocks ?? 1) === 3);
  if (!isThreeBlockBasic) return;

  // Avoid double-placing on the same platform.
  if (platform.spring) return;
  // If we already have too many springs visible, skip this one.
const camTop = scene.cameras.main.scrollY;
const camBot = camTop + scene.scale.height;
const inViewCount = (scene.springs?.getChildren?.() || []).filter(s => s && s.y >= camTop && s.y <= camBot).length;
if (inViewCount >= SPRING_MAX_IN_VIEW) return;
// Chance gate — essentials and optionals get different odds.
const chance = opts.isEssential ? SPRING_CHANCE_ESSENTIAL : SPRING_CHANCE_OPTIONAL;
if (Math.random() > chance) return;



  // Decide X offset over the platform: middle or 'far' from previous essential.
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

  // PSEUDOCODE: Use the platform’s *top* (physics body top or visual top) so the spring sits ON the surface, not inside the block.
  const x = platform.x + localX;
  const platTop =
  (platform.body && typeof platform.body.top === "number")
    ? platform.body.top
    : (platform.y - ((platform.displayHeight || platform.body?.height || 0) / 2));
  const y = Math.round(platTop); // align to whole pixels to avoid half-pixel bleed


  // Create & store.
  const spring = new Spring(scene, x, y);
  platform.spring = spring;
// Keep springs in a group so we can count what's on screen for the cap.
if (!scene.springs) scene.springs = scene.physics.add.staticGroup();
scene.springs.add(spring);

  // Collider: bounce only when player is falling onto it (one-way feel).
  scene.physics.add.overlap(scene.player || player, spring, (plr, spr) => {
    const body = plr.body;
    if (!body) return;

    // Only trigger if player is moving downward / feet region intersects from above.
    const descending = body.velocity.y > -30; // a little leeway; treat near-zero as down
    const aboveTop   = (plr.y <= spr.y + 2);
    if (!descending || !aboveTop) return;

    //  Fire hooks so Player can switch to “spring mode” animation externally.
    scene.events.emit("spring:start", { player: plr, spring: spr });

    // Play the visual bounce; when done, signal end hook.
    spr.playBounce(() => {
      scene.events.emit("spring:end", { player: plr, spring: spr });
    });

    //  Apply a strong vertical launch — actual “ignore-platforms” logic should live in Player.
    body.setVelocityY(-900);
  }, null, scene);
}
