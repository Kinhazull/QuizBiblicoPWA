"use client";

import Image from "next/image";
import { useState } from "react";

export type RewardArtType = "coin" | "xp" | "level" | "achievement" | "daily-challenge" | "chest-standard" | "chest-special" | "chest-daily";
type RewardArtEntry = { master: string; compact?: string; card?: string; fallback: string; label: string };

export const rewardArtRegistry: Record<RewardArtType, RewardArtEntry> = {
  coin: { master: "/rewards/coin.png", compact: "/rewards/runtime/coin-compact.png", fallback: "🪙", label: "Moedas" },
  xp: { master: "/rewards/xp.png", compact: "/rewards/runtime/xp-compact.png", fallback: "XP", label: "XP" },
  level: { master: "/rewards/level.png", compact: "/rewards/runtime/level-compact.png", fallback: "★", label: "Nível" },
  achievement: { master: "/rewards/achievement.png", compact: "/rewards/runtime/achievement-compact.png", card: "/rewards/runtime/achievement-card.png", fallback: "🏆", label: "Conquista" },
  "daily-challenge": { master: "/rewards/daily-challenge.png", compact: "/rewards/runtime/daily-challenge-compact.png", card: "/rewards/runtime/daily-challenge-card.png", fallback: "🎯", label: "Desafio diário" },
  "chest-standard": { master: "/rewards/chest-standard.png", card: "/rewards/runtime/chest-standard-card.png", fallback: "🎁", label: "Baú padrão" },
  "chest-special": { master: "/rewards/chest-special.png", card: "/rewards/runtime/chest-special-card.png", fallback: "🏆", label: "Baú especial" },
  "chest-daily": { master: "/rewards/chest-daily.png", card: "/rewards/runtime/chest-daily-card.png", fallback: "🎁", label: "Cofre diário" },
};

export function RewardArt({ type, variant = "compact", className = "", decorative = true, sizes, eager = false }: { type: RewardArtType; variant?: "compact" | "card"; className?: string; decorative?: boolean; sizes?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const entry = rewardArtRegistry[type];
  const source = variant === "card" ? entry.card : entry.compact;
  if (failed || !source) return <span className={`reward-art reward-art-fallback ${className}`} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : entry.label}>{entry.fallback}</span>;
  return <span className={`reward-art reward-art-${variant} ${className}`} aria-hidden={decorative || undefined}>
    <Image src={source} alt={decorative ? "" : entry.label} width={variant === "card" ? 320 : 96} height={variant === "card" ? 320 : 96} sizes={sizes || (variant === "card" ? "160px" : "32px")} loading={eager ? "eager" : "lazy"} unoptimized onError={() => setFailed(true)} />
  </span>;
}
