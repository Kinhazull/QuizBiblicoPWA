export const PLATFORM_ECONOMY_VERSION = "v2" as const;

export const GAME_FINISHED_ECONOMY = Object.freeze({
  completionXp: 20,
  performanceXpMaximum: 20,
  perfectXpBonus: 10,
  firstOfficialGameDailyXp: 10,
  completionCoins: 1,
  performanceCoinThreshold: 0.7,
  performanceCoins: 1,
  perfectCoins: 1,
  maximumXpPerGame: 50,
  maximumCoinsPerGame: 3,
});

export const DAILY_LOGIN_ECONOMY = Object.freeze({
  baseXp: 10,
  xpStep: 2,
  baseCoins: 2,
  coinStepEveryDays: 2,
  maximumStreakStep: 7,
});

export const DAILY_CHEST_ECONOMY = Object.freeze({
  variants: Object.freeze([
    Object.freeze({ xp: 20, coins: 0 }),
    Object.freeze({ xp: 0, coins: 5 }),
    Object.freeze({ xp: 10, coins: 3 }),
  ]),
});

export const DAILY_CHALLENGE_ECONOMY = Object.freeze({
  targets: Object.freeze({ intermediate: 3, complete: 7 }),
  rewards: Object.freeze({
    3: Object.freeze({ xp: 30, coins: 5, label: "+30 XP e +5 moedas" }),
    7: Object.freeze({ xp: 70, coins: 12, label: "+70 XP e +12 moedas" }),
  }),
});

export type ShopCategory = "frame" | "avatar";
export type ShopCatalogItem = {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  price: number;
  icon: string;
};

export const SHOP_CATALOG: readonly ShopCatalogItem[] = Object.freeze([
  Object.freeze({ id: "frame-bronze", category: "frame", name: "Moldura Bronze", description: "Uma moldura clássica para seu perfil.", price: 60, icon: "🥉" }),
  Object.freeze({ id: "frame-silver", category: "frame", name: "Moldura Prata", description: "Uma moldura brilhante para seu perfil.", price: 140, icon: "🥈" }),
  Object.freeze({ id: "frame-gold", category: "frame", name: "Moldura Ouro", description: "Uma moldura especial para grandes conquistas.", price: 260, icon: "🥇" }),
  Object.freeze({ id: "avatar-scroll", category: "avatar", name: "Avatar Pergaminho", description: "Um símbolo de estudo e sabedoria.", price: 90, icon: "📜" }),
  Object.freeze({ id: "avatar-dove", category: "avatar", name: "Avatar Pomba", description: "Um símbolo de paz e esperança.", price: 160, icon: "🕊️" }),
  Object.freeze({ id: "avatar-lion", category: "avatar", name: "Avatar Leão", description: "Um símbolo de coragem e força.", price: 240, icon: "🦁" }),
]);

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG.find(item => item.id === itemId) || null;
}
