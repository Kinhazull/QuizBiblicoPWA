export const PLATFORM_HOME_PREVIEW = {
  progress: {
    level: 1,
    totalXp: 0,
    coins: 0,
    curveVersion: "quadratic-v1",
    levelProgress: { currentXp: 0, targetXp: 100, percent: 0 },
  },
  gems: 0,
  mission: {
    title: "Complete uma Jornada no Quiz Bíblico",
    current: 0,
    target: 1,
    rewardLabel: "+50 XP",
  },
  dailyChest: { available: true, label: "1/1" },
} as const;

export const UPCOMING_GAMES = [
  { title: "3 Pistas", description: "Adivinhe com sabedoria", icon: "🔎" },
  { title: "Palavra do Dia", description: "Inspiração para cada dia", icon: "📖" },
  { title: "Linha do Tempo", description: "Histórias bíblicas em ordem", icon: "⌛" },
  { title: "Batalha da Fé", description: "Desafios de fé e coragem", icon: "🛡️" },
] as const;
