import { PLATFORM_HOME_PREVIEW } from "./platform-home-config";
import { EquippedAvatar, type EquipmentView } from "./EquippedAvatar";
import { selectHomeEngagementAction } from "./platform-engagement";

type PlatformAchievement = {
  code: string;
  name: string;
  icon: string | null;
  scopeType: "global" | "game";
  gameId: string | null;
  unlocked: boolean;
  unlockedAt: number | null;
};
export type PlatformAchievementData = { achievements?: PlatformAchievement[] };

export type PlatformProgressData = {
  level: number;
  totalXp: number;
  coins: number;
  curveVersion: string;
  levelProgress: { currentXp: number; targetXp: number; percent: number };
};

export type DailyRetentionData = {
  dayKey: string;
  streak: number;
  login: { claimed: boolean; reward: { xp: number; coins: number; label: string } };
  chest: {
    unlocked: boolean;
    opened: boolean;
    reward: { xp: number; coins: number; label: string } | null;
    preview: { xp: number; coins: number; label: string };
  };
};

export type DailyObjectiveData = {
  selectionId: string | null;
  gameType:
    | "wordle-biblico"
    | "quiz-biblico"
    | "linha-do-tempo-biblica"
    | "memoria-biblica"
    | "associacao-de-temas"
    | "quem-sou-eu"
    | "jogo-tres-pistas";
  title: string;
  status: "CREATED" | "STARTED" | "FINISHED" | "EXPIRED";
  availability: "AVAILABLE" | "UNAVAILABLE";
  unavailableReason: "insufficient_catalog" | "no_published_content" | "unsupported_game" | "generation_failed" | null;
  playHref: string | null;
  state: "AVAILABLE" | "WON" | "LOST" | "UNAVAILABLE";
};

export type DailyChallengeData = {
  dayKey: string;
  timeZone: string;
  wins: number;
  played: number;
  unavailable: number;
  total: 7;
  objectives: DailyObjectiveData[];
  rewards: Array<{ target: 3 | 7; state: "LOCKED" | "READY" | "CLAIMED"; reward: { xp: number; coins: number; label: string } }>;
};

export type PlatformEventSummary = {
  id: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  status: "SCHEDULED" | "ACTIVE" | "FINISHED";
  games: unknown[];
};

type PlatformHomeProps = {
  displayName: string;
  achievementData: PlatformAchievementData | null;
  progress: PlatformProgressData | null;
  daily: DailyRetentionData | null;
  dailyObjectives: DailyChallengeData | null;
  dailyBusy: boolean;
  dailyError: string;
  equipment: EquipmentView | null;
  events: PlatformEventSummary[];
  onOpenChest: () => void;
};

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || "participante";
}

function recentAchievements(data: PlatformAchievementData | null) {
  return (data?.achievements || [])
    .filter(item => item.unlocked && item.unlockedAt)
    .sort((left, right) => Number(right.unlockedAt) - Number(left.unlockedAt))
    .slice(0, 4);
}

export function PlatformHome({
  displayName,
  achievementData,
  progress,
  daily,
  dailyObjectives,
  dailyBusy,
  dailyError,
  equipment,
  events,
  onOpenChest,
}: PlatformHomeProps) {
  const achievements = recentAchievements(achievementData);
  const platformProgress = progress || PLATFORM_HOME_PREVIEW.progress;
  const objectives = dailyObjectives?.objectives || [];
  const dailyWins = dailyObjectives?.wins || 0;
  const objectivePercent = Math.round((dailyWins / 7) * 100);
  const nextReward = dailyObjectives?.rewards?.find(item => item.state === "READY")
    || dailyObjectives?.rewards?.find(item => item.state === "LOCKED");
  const featuredEvent = events.find(item => item.status === "ACTIVE") || events.find(item => item.status === "SCHEDULED");
  const engagement = selectHomeEngagementAction(dailyObjectives, daily, events);

  return <main className="platform-home">
    <div className="platform-ambient platform-ambient-one" aria-hidden="true" />
    <div className="platform-ambient platform-ambient-two" aria-hidden="true" />
    <div className="platform-home-inner">
      <header className="platform-brand-row">
        <div className="platform-brand" aria-label="Conte os Feitos">
          <span className="platform-brand-mark" aria-hidden="true"><b>C</b><i>✦</i></span>
          <span>Conte os <strong>Feitos</strong></span>
        </div>
        <nav className="platform-collection-actions" aria-label="Coleção">
          <a className="platform-shop-button" href="/inventario"><span aria-hidden="true">🎒</span> Inventário</a>
          <a className="platform-shop-button" href="/loja"><span aria-hidden="true">🛍️</span> Loja</a>
        </nav>
      </header>

      <section className="platform-player-card" aria-labelledby="platform-greeting">
        <EquippedAvatar displayName={displayName} equipment={equipment} />
        <div className="platform-player-copy">
          <h1 id="platform-greeting">Fala, {firstName(displayName)}! <span aria-hidden="true">👋</span></h1>
          <p>Que bom ter você por aqui!</p>
          <div className="platform-level-line">
            <span>Nível {platformProgress.level}</span>
            <div className="platform-progress"><i style={{ width: `${platformProgress.levelProgress.percent}%` }} /></div>
            <small>{platformProgress.levelProgress.currentXp.toLocaleString("pt-BR")} / {platformProgress.levelProgress.targetXp.toLocaleString("pt-BR")} XP</small>
          </div>
          <a className="platform-ranking-link" href="/rankings">Ver Ranking <span aria-hidden="true">→</span></a>
        </div>
        <div className="platform-currencies" aria-label="Saldo da plataforma">
          <span><b aria-hidden="true">🪙</b><strong>{platformProgress.coins.toLocaleString("pt-BR")}</strong><small>Moedas</small></span>
        </div>
        <div className="platform-daily-login" role="status">
          <span aria-hidden="true">🔥</span>
          <div>
            <strong>{daily ? `${daily.streak} dia${daily.streak === 1 ? "" : "s"} de sequência` : "Preparando recompensa diária"}</strong>
            <small>{dailyError || (daily?.login.claimed ? `Recompensa de hoje: ${daily.login.reward.label}` : "Sua recompensa será entregue ao entrar.")}</small>
          </div>
        </div>
      </section>

      <section className={`platform-engagement-focus ${engagement.kind.toLowerCase()}`} aria-labelledby="engagement-focus-title">
        <div><p>{engagement.eyebrow}</p><h2 id="engagement-focus-title">{engagement.title}</h2><span>{engagement.description}</span></div>
        <a href={engagement.href}>{engagement.label} <span aria-hidden="true">→</span></a>
      </section>

      <section className="platform-daily-summary" aria-labelledby="daily-summary-title">
        <header>
          <div><p>Desafios diários</p><h2 id="daily-summary-title">{dailyWins} de 7 vitórias</h2></div>
          <a href="/desafios-diarios">{nextReward?.state === "READY" ? "Resgatar recompensa" : "Ver desafios"} <span aria-hidden="true">→</span></a>
        </header>
        <div className="platform-progress" role="progressbar" aria-label="Vitórias nos desafios diários" aria-valuemin={0} aria-valuemax={7} aria-valuenow={dailyWins}>
          <i style={{ width: `${objectivePercent}%` }} />
        </div>
        <div className="platform-daily-dots" role="img" aria-label={`${dailyWins} de 7 vitórias`}>
          {objectives.length === 7 ? objectives.map(item => <i className={item.state.toLowerCase()} key={item.gameType} aria-hidden="true" />)
            : Array.from({ length: 7 }, (_, index) => <i key={index} aria-hidden="true" />)}
        </div>
        <div className="platform-daily-milestones">
          <span className={dailyWins >= 3 ? "complete" : ""}><b>3 vitórias</b><small>{dailyObjectives?.rewards?.[0]?.state === "CLAIMED" ? "Recompensa resgatada" : dailyObjectives?.rewards?.[0]?.reward.label || "Recompensa intermediária"}</small></span>
          <span className={dailyWins >= 7 ? "complete" : ""}><b>7 vitórias</b><small>{dailyObjectives?.rewards?.[1]?.state === "CLAIMED" ? "XP, moedas e Avatar Lâmpada resgatados" : `${dailyObjectives?.rewards?.[1]?.reward.label || "Recompensa completa"} + Avatar Lâmpada`}</small></span>
        </div>
      </section>

      <section className="platform-play-hub" aria-labelledby="play-hub-title">
        <div aria-hidden="true">🎮</div>
        <div><p>Jogar</p><h2 id="play-hub-title">Escolha seu próximo desafio</h2><span>Todos os jogos da plataforma em um só lugar.</span></div>
        <a href="/jogos">Ver jogos <span aria-hidden="true">→</span></a>
      </section>

      {featuredEvent && engagement.eventId !== featuredEvent.id ? <section className="platform-event-card" aria-labelledby="featured-event-title">
        <div><p>{featuredEvent.status === "ACTIVE" ? "Evento ativo" : "Próximo evento"}</p>
          <h2 id="featured-event-title">{featuredEvent.title}</h2><span>{featuredEvent.description}</span></div>
        <a href={`/eventos/detalhes?id=${encodeURIComponent(featuredEvent.id)}`}>Ver evento <span aria-hidden="true">→</span></a>
      </section> : null}

      <section className="platform-daily-chest" id="recompensas" aria-labelledby="chest-title">
        <div className="platform-chest-art" aria-hidden="true">🎁</div>
        <div><p>Cofre diário</p><h2 id="chest-title">{daily?.chest.opened ? "Recompensa coletada" : daily?.chest.unlocked ? "Seu cofre está disponível" : "Conclua a missão do dia"}</h2>
          <span>{dailyError || (daily?.chest.opened ? `Você recebeu ${daily.chest.reward?.label}.` : daily?.chest.unlocked ? "Abra uma vez para receber sua recompensa." : "O cofre será liberado após concluir a missão diária.")}</span></div>
        <strong>{daily?.chest.reward?.label || daily?.chest.preview.label || "Recompensa surpresa"}</strong>
        <button type="button" onClick={onOpenChest} disabled={dailyBusy || !daily?.chest.unlocked || daily.chest.opened}>
          {dailyBusy ? "Aguarde..." : daily?.chest.opened ? "Aberto hoje" : daily?.chest.unlocked ? "Abrir cofre" : "Bloqueado"}
        </button>
      </section>

      <section className="platform-section platform-achievements" aria-labelledby="achievements-title">
        <header><h2 id="achievements-title">Conquistas recentes</h2><a href="/perfil">Ver no perfil <span aria-hidden="true">›</span></a></header>
        {achievements.length > 0
          ? <div className="platform-achievement-grid">{achievements.map(item => <article key={item.code}><b aria-hidden="true">{item.icon || "⭐"}</b><div><strong>{item.name}</strong><small>{item.scopeType === "game" ? "Conquista de jogo" : "Conquista da plataforma"}</small></div></article>)}</div>
          : <div className="platform-empty-achievements"><span aria-hidden="true">✦</span><div><strong>Suas conquistas aparecerão aqui</strong><small>Jogue e complete desafios para desbloquear conquistas.</small></div></div>}
      </section>
    </div>
  </main>;
}
