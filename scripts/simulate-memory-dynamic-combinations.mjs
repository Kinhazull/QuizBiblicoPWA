import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const digest = value => createHash("sha256").update(value).digest("hex");

export function simulateMemoryCombinations(totalGames = 1200, catalogSize = 100) {
  const usage = new Map(Array.from({ length: catalogSize }, (_, index) => [`memory-${index + 1}`, 0]));
  const pairUsage = new Map(Array.from({ length: catalogSize }, (_, contentIndex) => (
    Array.from({ length: 3 }, (_, pairIndex) => [`memory-${contentIndex + 1}:pair-${pairIndex}`, 0])
  )).flat());
  const recent = [];
  const seen = new Set();
  const checkpoints = new Set([30, 100, 365, 730, 1200].filter(value => value <= totalGames));
  const results = [];
  let repeats = 0;
  let firstRepeatAt = null;

  for (let game = 1; game <= totalGames; game += 1) {
    const seed = `recovery-org:synthetic-user:memoria-biblica:free-play-${game}:v1`;
    const excluded = new Set(recent.slice(0, 20));
    const eligible = [...usage.keys()].filter(id => !excluded.has(id));
    eligible.sort((left, right) => usage.get(left) - usage.get(right)
      || digest(`${seed}:${left}`).localeCompare(digest(`${seed}:${right}`)));
    const selected = eligible.slice(0, 3);
    const pairs = selected.map(id => `${id}:pair-${Number.parseInt(digest(`${seed}:${id}:1:memory-pair-v1`).slice(0, 8), 16) % 3}`);
    const signature = [...pairs].sort().join("|");
    if (seen.has(signature)) {
      repeats += 1;
      firstRepeatAt ??= game;
    }
    seen.add(signature);
    selected.forEach(id => usage.set(id, usage.get(id) + 1));
    pairs.forEach(pair => pairUsage.set(pair, pairUsage.get(pair) + 1));
    recent.unshift(...selected);
    if (checkpoints.has(game)) {
      results.push({ games: game, unique: seen.size, repeats, repeatRate: repeats / game });
    }
  }

  const orderedPairUsage = [...pairUsage.values()].sort((left, right) => right - left);
  const totalPairUses = orderedPairUsage.reduce((sum, count) => sum + count, 0);
  const topDecileSize = Math.max(1, Math.ceil(orderedPairUsage.length * 0.1));
  const topDecileUses = orderedPairUsage.slice(0, topDecileSize).reduce((sum, count) => sum + count, 0);

  return {
    catalogSize,
    canonicalPairs: catalogSize * 3,
    totalGames,
    unique: seen.size,
    repeats,
    firstRepeatAt,
    pairUsage: {
      average: totalPairUses / orderedPairUsage.length,
      minimum: orderedPairUsage.at(-1) ?? 0,
      maximum: orderedPairUsage[0] ?? 0,
      topDecileShare: totalPairUses === 0 ? 0 : topDecileUses / totalPairUses,
    },
    checkpoints: results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(simulateMemoryCombinations(), null, 2));
}
