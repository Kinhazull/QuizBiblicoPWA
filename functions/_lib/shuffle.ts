export function seededShuffle<T>(items: T[], seedText: string) {
  const result = [...items]; let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) { seed ^= seedText.charCodeAt(i); seed = Math.imul(seed, 16777619); }
  const random = () => { seed += 0x6D2B79F5; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
