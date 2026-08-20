import type { DailyChallengeData, DailyRetentionData, PlatformEventSummary } from "./PlatformHome";

export type HomeEngagementAction = {
  kind: "DAILY_REWARD" | "DAILY_PROGRESS" | "CHEST" | "ACTIVE_EVENT" | "DAILY_NEW" | "UPCOMING_EVENT" | "GAMES";
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  href: string;
  eventId?: string;
};

/** One deterministic next action keeps the Home useful without turning it into a dashboard. */
export function selectHomeEngagementAction(
  daily: DailyChallengeData | null,
  retention: DailyRetentionData | null,
  events: PlatformEventSummary[],
): HomeEngagementAction {
  const ready = daily?.rewards?.find(reward => reward.state === "READY");
  if (ready) return {
    kind: "DAILY_REWARD", eyebrow: "Recompensa disponível", title: `Meta de ${ready.target}/7 alcançada`,
    description: `${ready.reward.label}${ready.target === 7 ? " + Avatar Lâmpada" : ""}.`, label: "Resgatar agora", href: "/desafios-diarios",
  };
  const available = daily?.objectives?.filter(objective => objective.state === "AVAILABLE") || [];
  if (daily && daily.played > 0 && available.length > 0) return {
    kind: "DAILY_PROGRESS", eyebrow: "Continue de onde parou", title: `${daily.wins}/7 vitórias hoje`,
    description: `${available.length} desafio${available.length === 1 ? "" : "s"} ainda ${available.length === 1 ? "disponível" : "disponíveis"}.`, label: "Ver desafios", href: "/desafios-diarios",
  };
  if (retention?.chest.unlocked && !retention.chest.opened) return {
    kind: "CHEST", eyebrow: "Cofre disponível", title: "Sua recompensa diária está pronta",
    description: retention.chest.preview.label, label: "Abrir cofre", href: "/#recompensas",
  };
  const active = events.find(event => event.status === "ACTIVE");
  if (active) return {
    kind: "ACTIVE_EVENT", eyebrow: "Evento ativo", title: active.title, description: active.description,
    label: "Participar do evento", href: `/eventos/detalhes?id=${encodeURIComponent(active.id)}`, eventId: active.id,
  };
  if (available.length > 0) return {
    kind: "DAILY_NEW", eyebrow: "Objetivos do dia", title: "Seus desafios estão prontos",
    description: "Uma tentativa por jogo para avançar nas metas de hoje.", label: "Ver desafios", href: "/desafios-diarios",
  };
  const upcoming = events.find(event => event.status === "SCHEDULED");
  if (upcoming) return {
    kind: "UPCOMING_EVENT", eyebrow: "Próximo evento", title: upcoming.title, description: upcoming.description,
    label: "Ver evento", href: `/eventos/detalhes?id=${encodeURIComponent(upcoming.id)}`, eventId: upcoming.id,
  };
  return { kind: "GAMES", eyebrow: "Jogar", title: "Escolha seu próximo desafio", description: "Todos os jogos da plataforma em um só lugar.", label: "Ver jogos", href: "/jogos" };
}
