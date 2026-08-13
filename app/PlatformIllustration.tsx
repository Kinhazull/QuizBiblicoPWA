"use client";

import Image from "next/image";

export type PlatformIllustrationId = "offline" | "empty-state" | "error-state" | "celebration" | "default-event" | "event-completed" | "event-unavailable" | "collection-complete" | "ranking-podium";

export const platformIllustrationRegistry: Record<PlatformIllustrationId, { path: string; purpose: string }> = {
  offline: { path: "/illustration/runtime/system/offline-card.png", purpose: "Estado offline recuperável" },
  "empty-state": { path: "/illustration/runtime/system/empty-state-card.png", purpose: "Lista vazia" },
  "error-state": { path: "/illustration/runtime/system/error-state-card.png", purpose: "Erro recuperável" },
  celebration: { path: "/illustration/runtime/progression/celebration-card.png", purpose: "Celebração existente" },
  "collection-complete": { path: "/illustration/runtime/progression/collection-complete-card.png", purpose: "Coleção completa" },
  "ranking-podium": { path: "/illustration/runtime/progression/ranking-podium-card.png", purpose: "Pódio do Ranking" },
  "default-event": { path: "/illustration/runtime/events/default-event-card.png", purpose: "Evento sem capa" },
  "event-completed": { path: "/illustration/runtime/events/event-completed-card.png", purpose: "Evento encerrado" },
  "event-unavailable": { path: "/illustration/runtime/events/event-unavailable-card.png", purpose: "Evento indisponível" },
};

export function PlatformIllustration({ id, className = "", eager = false, customUrl }: { id: PlatformIllustrationId; className?: string; eager?: boolean; customUrl?: string | null }) {
  const entry = platformIllustrationRegistry[id];
  return <span className={`platform-illustration ${className}`} data-illustration={id} title={entry.purpose} aria-hidden="true">
    <Image src={entry.path} alt="" width={320} height={320} sizes="(max-width: 600px) 180px, 240px" loading={eager ? "eager" : "lazy"} unoptimized />
    {customUrl ? <span className="platform-illustration-custom" style={{ backgroundImage: `url(${JSON.stringify(customUrl)})` }} /> : null}
  </span>;
}

export function eventIllustration(status: string): PlatformIllustrationId {
  return status === "FINISHED" ? "event-completed" : "default-event";
}
