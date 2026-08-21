"use client";

import Image from "next/image";
import { useState } from "react";

type CollectibleArtEntry = {
  type: "avatar" | "frame";
  compact: string;
  standard: string;
  fallback: string;
  alias?: string;
};
export const collectibleArtRegistry: Record<string, CollectibleArtEntry> = {
  "avatar-ark": avatar("avatar-ark", "🚢"),
  "avatar-crown": avatar("avatar-crown", "👑"),
  "avatar-dove": avatar("avatar-dove", "🕊️"),
  "avatar-fish": avatar("avatar-fish", "🐟"),
  "avatar-lamp": avatar("avatar-lamp", "🪔"),
  "avatar-lion": avatar("avatar-lion", "🦁"),
  "avatar-olive": avatar("avatar-olive", "🫒"),
  "avatar-scroll": avatar("avatar-scroll", "📜"),
  "frame-bronze": frame("frame-bronze", "🥉"),
  "frame-celestial": frame("frame-celestial", "🌟"),
  "frame-gold": frame("frame-gold", "🥇"),
  "frame-light": frame("frame-light", "✨"),
  "frame-olive": frame("frame-olive", "🫒"),
  "frame-silver": frame("frame-silver", "🥈"),
  "frame-covenant": { ...frame("frame-covenant", "🌈"), alias: "frame-aliance" },
  "frame-royal": { ...frame("frame-royal", "🟣"), alias: "frame-real" },
};
function avatar(id: string, fallback: string): CollectibleArtEntry {
  return paths("avatar", id, fallback);
}
function frame(id: string, fallback: string): CollectibleArtEntry {
  return paths("frame", id, fallback);
}
function paths(type: "avatar" | "frame", id: string, fallback: string): CollectibleArtEntry {
  const folder = `${type}s`;
  return {
    type,
    compact: `/collectibles/runtime/${folder}/${id}-compact.png`,
    standard: `/collectibles/runtime/${folder}/${id}-standard.png`,
    fallback,
  };
}

export function CollectibleArt({
  id,
  fallback,
  variant = "standard",
  className = "",
  priority = false,
}: {
  id: string;
  fallback?: string;
  variant?: "compact" | "standard";
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const entry = collectibleArtRegistry[id];
  if (!entry || failed) {
    return <span className={`collectible-art collectible-art-fallback ${className}`} aria-hidden="true">{fallback || entry?.fallback || "◇"}</span>;
  }
  const size = variant === "compact" ? 96 : 320;
  return <span className={`collectible-art collectible-art-${entry.type} collectible-art-${variant} ${className}`} aria-hidden="true">
    <Image src={entry[variant]} alt="" width={size} height={size} sizes={variant === "compact" ? "48px" : "160px"} loading={priority ? "eager" : "lazy"} priority={priority} unoptimized onError={() => setFailed(true)} />
  </span>;
}
