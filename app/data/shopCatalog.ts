export type ShopCategory = "frame" | "avatar";

export type ShopCatalogItem = {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  price: number;
  icon: string;
};

export const SHOP_CATALOG: readonly ShopCatalogItem[] = [
  { id: "frame-bronze", category: "frame", name: "Moldura Bronze", description: "Uma moldura clássica para seu perfil.", price: 20, icon: "🥉" },
  { id: "frame-silver", category: "frame", name: "Moldura Prata", description: "Uma moldura brilhante para seu perfil.", price: 40, icon: "🥈" },
  { id: "frame-gold", category: "frame", name: "Moldura Ouro", description: "Uma moldura especial para grandes conquistas.", price: 70, icon: "🥇" },
  { id: "avatar-scroll", category: "avatar", name: "Avatar Pergaminho", description: "Um símbolo de estudo e sabedoria.", price: 30, icon: "📜" },
  { id: "avatar-dove", category: "avatar", name: "Avatar Pomba", description: "Um símbolo de paz e esperança.", price: 45, icon: "🕊️" },
  { id: "avatar-lion", category: "avatar", name: "Avatar Leão", description: "Um símbolo de coragem e força.", price: 60, icon: "🦁" },
] as const;

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG.find(item => item.id === itemId) || null;
}
