import { SHOP_CATALOG, type ShopCatalogItem } from "./platform-economy";

export type CollectibleRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC";
export type CollectibleOrigin = "SHOP" | "ACHIEVEMENT" | "DAILY" | "EVENT" | "MISSION";

export type CollectibleItem = ShopCatalogItem & {
  collectionId: "biblical-symbols" | "journey-frames";
  rarity: CollectibleRarity;
  origin: CollectibleOrigin;
  originRef: string | null;
};

export type CollectionDefinition = {
  id: CollectibleItem["collectionId"];
  name: string;
  description: string;
  coverIcon: string;
  itemIds: readonly string[];
};

const metadata: Record<string, Pick<CollectibleItem, "collectionId" | "rarity" | "origin" | "originRef">> = {
  "avatar-scroll": { collectionId: "biblical-symbols", rarity: "COMMON", origin: "SHOP", originRef: null },
  "avatar-dove": { collectionId: "biblical-symbols", rarity: "UNCOMMON", origin: "SHOP", originRef: null },
  "avatar-lion": { collectionId: "biblical-symbols", rarity: "RARE", origin: "SHOP", originRef: null },
  "avatar-lamp": { collectionId: "biblical-symbols", rarity: "COMMON", origin: "DAILY", originRef: "daily_challenge_7" },
  "avatar-fish": { collectionId: "biblical-symbols", rarity: "UNCOMMON", origin: "SHOP", originRef: null },
  "avatar-olive": { collectionId: "biblical-symbols", rarity: "UNCOMMON", origin: "SHOP", originRef: null },
  "avatar-ark": { collectionId: "biblical-symbols", rarity: "RARE", origin: "SHOP", originRef: null },
  "avatar-crown": { collectionId: "biblical-symbols", rarity: "EPIC", origin: "SHOP", originRef: null },
  "frame-bronze": { collectionId: "journey-frames", rarity: "COMMON", origin: "SHOP", originRef: null },
  "frame-silver": { collectionId: "journey-frames", rarity: "UNCOMMON", origin: "SHOP", originRef: null },
  "frame-gold": { collectionId: "journey-frames", rarity: "EPIC", origin: "SHOP", originRef: null },
  "frame-olive": { collectionId: "journey-frames", rarity: "COMMON", origin: "SHOP", originRef: null },
  "frame-covenant": { collectionId: "journey-frames", rarity: "UNCOMMON", origin: "SHOP", originRef: null },
  "frame-light": { collectionId: "journey-frames", rarity: "RARE", origin: "ACHIEVEMENT", originRef: "first_steps" },
  "frame-royal": { collectionId: "journey-frames", rarity: "RARE", origin: "SHOP", originRef: null },
  "frame-celestial": { collectionId: "journey-frames", rarity: "EPIC", origin: "SHOP", originRef: null },
};

export const COLLECTIBLE_GRANTS = Object.freeze({
  dailyChallenge7: "avatar-lamp",
  achievements: Object.freeze({ first_steps: "frame-light" }),
});

export const COLLECTIBLE_CATALOG: readonly CollectibleItem[] = Object.freeze(SHOP_CATALOG.map(item => {
  const itemMetadata = metadata[item.id];
  if (!itemMetadata) throw new Error(`collectible_metadata_missing:${item.id}`);
  return Object.freeze({ ...item, ...itemMetadata });
}));

export const COLLECTIONS: readonly CollectionDefinition[] = Object.freeze([
  Object.freeze({
    id: "biblical-symbols",
    name: "Símbolos Bíblicos",
    description: "Avatares inspirados em símbolos de fé, esperança e perseverança.",
    coverIcon: "🕊️",
    itemIds: Object.freeze(COLLECTIBLE_CATALOG.filter(item => item.collectionId === "biblical-symbols").map(item => item.id)),
  }),
  Object.freeze({
    id: "journey-frames",
    name: "Molduras da Plataforma",
    description: "Molduras permanentes para personalizar sua identidade na plataforma.",
    coverIcon: "✨",
    itemIds: Object.freeze(COLLECTIBLE_CATALOG.filter(item => item.collectionId === "journey-frames").map(item => item.id)),
  }),
]);

export function collectionProgress(collection: CollectionDefinition, ownedItemIds: ReadonlySet<string>) {
  const acquired = collection.itemIds.filter(itemId => ownedItemIds.has(itemId)).length;
  return {
    acquired,
    total: collection.itemIds.length,
    percent: collection.itemIds.length ? Math.floor((acquired / collection.itemIds.length) * 100) : 0,
    status: acquired === collection.itemIds.length ? "COMPLETE" as const : "IN_PROGRESS" as const,
  };
}
