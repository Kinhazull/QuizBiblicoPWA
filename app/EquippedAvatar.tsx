"use client";

import { CollectibleArt, collectibleArtRegistry } from "./CollectibleArt";

export type EquippedItem = {
  id: string;
  category: "frame" | "avatar";
  name: string;
  icon: string;
  equipped: boolean;
};

export type EquipmentView = {
  items: EquippedItem[];
  equipped: { frame: string | null; avatar: string | null };
};

export function EquippedAvatar({
  displayName,
  equipment,
  size = "medium",
}: {
  displayName: string;
  equipment: EquipmentView | null;
  size?: "medium" | "large";
}) {
  const avatar = equipment?.items.find(item => item.category === "avatar" && item.equipped);
  const frame = equipment?.items.find(item => item.category === "frame" && item.equipped);
  const avatarId = equipment?.equipped.avatar || avatar?.id;
  const frameId = equipment?.equipped.frame || frame?.id;
  const fallback = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return <div
    className={`equipped-avatar equipped-avatar-${size}`}
    data-frame={frameId || "none"}
    data-avatar={avatarId || "none"}
    role="img"
    aria-label={avatar || frame
      ? `${avatar?.name || "Avatar padrão"}${frame ? ` com ${frame.name}` : ""}`
      : `Avatar de ${displayName}`}
  >
    <span className="equipped-avatar-base" aria-hidden="true">{avatarId ? <CollectibleArt id={avatarId} fallback={avatar?.icon || fallback} variant="compact" priority /> : fallback}</span>
    {frameId && (collectibleArtRegistry[frameId] || frame?.icon) ? <CollectibleArt id={frameId} fallback={frame?.icon} variant="compact" className="equipped-avatar-frame" priority /> : null}
  </div>;
}
