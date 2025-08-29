// Central platform configuration for selection + metadata.
export const PLATFORM_TYPES = [
  // "spawnWeight" acts like spawn %, but as a relative weight (no need to sum to 100)
  { key: "castle_platform", spawnWeight: 2, blocks: 3 },
  { key: "basic_1",        spawnWeight: 1, blocks: 1 },
];

// Optional helpers if you need them elsewhere later:
export const PLATFORM_META_BY_KEY = PLATFORM_TYPES.reduce((m, t) => {
  m[t.key] = t;
  return m;
}, {});
export const PLATFORM_KEYS = PLATFORM_TYPES.map(t => t.key);