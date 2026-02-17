const ADJECTIVES = [
  "amber", "ancient", "arctic", "autumn", "azure",
  "blazing", "bold", "bright", "bronze", "calm",
  "cedar", "celest", "chrome", "cipher", "cobalt",
  "coral", "cosmic", "crimson", "crystal", "daring",
  "dawn", "deep", "delta", "distant", "dusk",
  "echo", "elder", "ember", "fading", "fierce",
  "flint", "frozen", "gentle", "gilded", "golden",
  "granite", "hollow", "hushed", "iron", "ivory",
  "jade", "keen", "kindled", "lapis", "lemon",
  "light", "lunar", "marble", "mellow", "misty",
  "mossy", "noble", "north", "obsid", "onyx",
  "opal", "pale", "pearl", "pine", "polished",
  "prism", "quiet", "rapid", "regal", "rising",
  "rowan", "ruby", "rustic", "sage", "scarlet",
  "shadow", "sharp", "silent", "silver", "slate",
  "solar", "steady", "still", "storm", "sunlit",
  "swift", "tidal", "timber", "verdant", "violet",
  "vivid", "warm", "woven", "zenith", "zephyr",
];

const NOUNS = [
  "anchor", "arrow", "atlas", "beacon", "birch",
  "blade", "bloom", "bridge", "brook", "canyon",
  "cedar", "cliff", "cloud", "comet", "compass",
  "condor", "coral", "crane", "creek", "crest",
  "delta", "drift", "dune", "eagle", "ember",
  "falcon", "fern", "finch", "flame", "flint",
  "forge", "frost", "garden", "gate", "glacier",
  "grove", "harbor", "hawk", "hearth", "heron",
  "hollow", "horizon", "isle", "jasper", "kindle",
  "lake", "lantern", "lark", "laurel", "leaf",
  "ledge", "linden", "lotus", "maple", "meadow",
  "mesa", "meteor", "moss", "narrows", "nebula",
  "nexus", "oak", "orbit", "osprey", "otter",
  "peak", "pebble", "phoenix", "pine", "plover",
  "pond", "prism", "quartz", "raven", "reef",
  "ridge", "river", "sage", "shore", "sparrow",
  "spire", "spring", "stone", "summit", "swift",
  "thistle", "thorn", "tide", "tower", "trail",
  "vale", "valley", "vessel", "vine", "willow",
];

export function generateAlias(existingAliases: Set<string>): string {
  const maxAttempts = ADJECTIVES.length * NOUNS.length;

  for (let i = 0; i < maxAttempts; i++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const alias = `${adj}-${noun}`;
    if (!existingAliases.has(alias)) {
      return alias;
    }
  }

  // Fallback: append random suffix
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}-${Math.floor(Math.random() * 1000)}`;
}
