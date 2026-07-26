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
  const fallback = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return <div
    className={`equipped-avatar equipped-avatar-${size}`}
    data-frame={frame?.id || "none"}
    role="img"
    aria-label={avatar || frame
      ? `${avatar?.name || "Avatar padrão"}${frame ? ` com ${frame.name}` : ""}`
      : `Avatar de ${displayName}`}
  >
    <span aria-hidden="true">{avatar?.icon || fallback}</span>
  </div>;
}
