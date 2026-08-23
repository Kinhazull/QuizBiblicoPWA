const checkpoints = [30, 100, 365, 730];

export const CONTENT_GATE_CATALOGS = {
  "quiz-biblico": { total: 984, count: 5, pools: { EASY: 393, MEDIUM: 393, HARD: 198 }, quotas: { EASY: 2, MEDIUM: 2, HARD: 1 } },
  "wordle-biblico": { total: 1200, count: 1 },
  "linha-do-tempo-biblica": { total: 800, count: 1 },
  "memoria-biblica": { total: 100, count: 1 },
  "associacao-de-temas": { total: 800, count: 1 },
  "quem-sou-eu": { total: 800, count: 1 },
  "jogo-tres-pistas": { total: 800, count: 1 },
};

function createPool(prefix, size) {
  return Array.from({ length: size }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(4, "0")}`,
    uses: 0,
    lastUsedAt: null,
  }));
}

function choose(pool, count, round) {
  return [...pool]
    .sort((left, right) => left.uses - right.uses
      || (left.lastUsedAt ?? -1) - (right.lastUsedAt ?? -1)
      || left.id.localeCompare(right.id))
    .slice(0, count)
    .map(item => {
      item.uses += 1;
      item.lastUsedAt = round;
      return item;
    });
}

function snapshot(pools, selections, selectedItems, firstRepeat) {
  const items = Object.values(pools).flat();
  const used = items.filter(item => item.uses > 0);
  const topSize = Math.max(1, Math.ceil(items.length * 0.1));
  const topUses = [...items].sort((left, right) => right.uses - left.uses)
    .slice(0, topSize).reduce((sum, item) => sum + item.uses, 0);
  const distribution = Object.fromEntries(Object.entries(Object.groupBy(items, item => String(item.uses)))
    .map(([uses, entries]) => [uses, entries.length]));
  return {
    selections,
    selectedItems,
    uniqueContents: used.length,
    firstRepeatSelection: firstRepeat,
    repeatRate: Number(((selectedItems - used.length) / selectedItems).toFixed(6)),
    top10PercentShare: Number((topUses / selectedItems).toFixed(6)),
    usageDistribution: distribution,
  };
}

export function simulateSelectionPolicy(config, totalSelections) {
  const pools = config.pools
    ? Object.fromEntries(Object.entries(config.pools).map(([name, size]) => [name, createPool(name, size)]))
    : { ALL: createPool("content", config.total) };
  const seen = new Set();
  let firstRepeat = null;
  let selectedItems = 0;
  const results = {};
  const requestedCheckpoints = [...new Set([...checkpoints, totalSelections])].filter(value => value <= totalSelections);
  for (let round = 1; round <= totalSelections; round += 1) {
    const selected = config.quotas
      ? Object.entries(config.quotas).flatMap(([pool, count]) => choose(pools[pool], count, round))
      : choose(pools.ALL, config.count, round);
    for (const item of selected) {
      selectedItems += 1;
      if (seen.has(item.id) && firstRepeat === null) firstRepeat = round;
      seen.add(item.id);
    }
    if (requestedCheckpoints.includes(round)) {
      results[round] = snapshot(pools, round, selectedItems, firstRepeat);
    }
  }
  return results;
}

export function buildContentGateSimulation() {
  return Object.fromEntries(Object.entries(CONTENT_GATE_CATALOGS).map(([gameType, config]) => [
    gameType,
    simulateSelectionPolicy(config, gameType === "wordle-biblico" ? 1200 : 730),
  ]));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  console.log(JSON.stringify(buildContentGateSimulation(), null, 2));
}
