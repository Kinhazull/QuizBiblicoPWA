import { getJourneyCardView, type JourneyCardData } from "./journey-card-state";
import { PLATFORM_HOME_PREVIEW, UPCOMING_GAMES } from "./platform-home-config";

type BadgeDefinition = { code: string; name: string; icon?: string; description?: string };
type EarnedBadge = { code: string; earnedAt: number };
export type PlatformBadgeData = { badges?: BadgeDefinition[]; earned?: EarnedBadge[]; newBadges?: BadgeDefinition[] };

type PlatformHomeProps = {
  displayName: string;
  journey: JourneyCardData | null;
  badges: PlatformBadgeData | null;
  progress: PlatformProgressData | null;
  remaining: (target?: number) => string;
};

export type PlatformProgressData = {
  level: number;
  totalXp: number;
  coins: number;
  curveVersion: string;
  levelProgress: { currentXp: number; targetXp: number; percent: number };
};

function firstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || "participante";
}

function progressFor(journey: JourneyCardData | null) {
  if (journey?.completion?.completed) return 100;
  if (journey?.completion?.inProgress) return 58;
  return 0;
}

function recentAchievements(data: PlatformBadgeData | null) {
  const definitions = new Map((data?.badges || []).map(item => [item.code, item]));
  return (data?.earned || []).slice(0, 4).map(item => ({ ...item, ...definitions.get(item.code) }));
}

export function PlatformHome({ displayName, journey, badges, progress, remaining }: PlatformHomeProps) {
  const view = getJourneyCardView(journey, remaining);
  const quizProgress = progressFor(journey);
  const achievements = recentAchievements(badges);
  const missionCurrent = journey?.completion?.completed ? 1 : PLATFORM_HOME_PREVIEW.mission.current;
  const platformProgress = progress || PLATFORM_HOME_PREVIEW.progress;
  const xpPercent = platformProgress.levelProgress.percent;

  return <main className="platform-home">
    <div className="platform-ambient platform-ambient-one" aria-hidden="true" />
    <div className="platform-ambient platform-ambient-two" aria-hidden="true" />
    <div className="platform-home-inner">
      <header className="platform-brand" aria-label="Conte os Feitos">
        <span className="platform-brand-mark" aria-hidden="true"><b>C</b><i>✦</i></span>
        <span>Conte os <strong>Feitos</strong></span>
      </header>

      <section className="platform-player-card" aria-labelledby="platform-greeting">
        <div className="platform-avatar" aria-hidden="true">{firstName(displayName).slice(0, 1).toUpperCase()}</div>
        <div className="platform-player-copy">
          <h1 id="platform-greeting">Fala, {firstName(displayName)}! <span aria-hidden="true">👋</span></h1>
          <p>Que bom ter você por aqui!</p>
          <div className="platform-level-line"><span>Nível {platformProgress.level}</span><div className="platform-progress"><i style={{ width: `${xpPercent}%` }} /></div><small>{platformProgress.levelProgress.currentXp.toLocaleString("pt-BR")} / {platformProgress.levelProgress.targetXp.toLocaleString("pt-BR")} XP</small></div>
        </div>
        <div className="platform-currencies" aria-label="Recursos da plataforma em prévia visual">
          <span><b aria-hidden="true">🪙</b><strong>{platformProgress.coins.toLocaleString("pt-BR")}</strong><small>Moedas</small></span>
          <span><b aria-hidden="true">💎</b><strong>{PLATFORM_HOME_PREVIEW.gems}</strong><small>Gemas</small></span>
        </div>
      </section>

      <section className="platform-continue-card" aria-labelledby="continue-title">
        <header><p>Continuar jogando</p><a href="/jornada">Ver progresso <span aria-hidden="true">›</span></a></header>
        <div className="platform-continue-content">
          <div className="platform-game-art" aria-hidden="true">📖</div>
          <div>
            <h2 id="continue-title">Quiz Bíblico</h2>
            <p>{view.eyebrow.toLocaleLowerCase("pt-BR")} · {quizProgress ? `${quizProgress}% concluído` : "pronto para começar"}</p>
            <div className="platform-progress platform-quiz-progress"><i style={{ width: `${quizProgress}%` }} /></div>
            <a className={view.href === "#" ? "platform-primary-action disabled" : "platform-primary-action"} href={view.href} aria-disabled={view.href === "#"}><span aria-hidden="true">▶</span>{view.action === "AGUARDE" ? "Preparando" : view.action}</a>
          </div>
          <div className="platform-trophy-watermark" aria-hidden="true">🏆</div>
        </div>
      </section>

      <section className="platform-mission-card" aria-labelledby="mission-title">
        <div className="platform-mission-icon" aria-hidden="true">🎯</div>
        <div><p>Missão do dia</p><h2 id="mission-title">{PLATFORM_HOME_PREVIEW.mission.title}</h2><span>{missionCurrent}/{PLATFORM_HOME_PREVIEW.mission.target} partida</span></div>
        <aside><small>Recompensa</small><strong>{PLATFORM_HOME_PREVIEW.mission.rewardLabel}</strong><span>Recurso em breve</span></aside>
      </section>

      <section className="platform-section platform-games" id="jogos" aria-labelledby="games-title">
        <header><h2 id="games-title">Seus jogos</h2><span>Novos desafios chegarão em breve</span></header>
        <div className="platform-game-grid">
          <a className="platform-game-tile available" href="/jogar"><span className="platform-chip">Disponível</span><b aria-hidden="true">📖</b><strong>Quiz Bíblico</strong><small>Desafie seu conhecimento</small><i>Jogar agora</i></a>
          {UPCOMING_GAMES.map(game => <article className="platform-game-tile locked" key={game.title}><span className="platform-chip">Em breve</span><b aria-hidden="true">{game.icon}</b><strong>{game.title}</strong><small>{game.description}</small><i>🔒 Em breve</i></article>)}
        </div>
      </section>

      <section className="platform-daily-chest" id="recompensas" aria-labelledby="chest-title">
        <div className="platform-chest-art" aria-hidden="true">🎁</div><div><p>Baú diário</p><h2 id="chest-title">Uma nova recompensa a cada dia</h2><span>A lógica de recompensas será liberada em uma próxima etapa.</span></div><strong>{PLATFORM_HOME_PREVIEW.dailyChest.label}</strong><button type="button" disabled>Em breve</button>
      </section>

      <section className="platform-section platform-achievements" aria-labelledby="achievements-title">
        <header><h2 id="achievements-title">Conquistas recentes</h2><a href="/medalhas">Ver todas <span aria-hidden="true">›</span></a></header>
        {achievements.length > 0 ? <div className="platform-achievement-grid">{achievements.map(item => <article key={item.code}><b aria-hidden="true">{item.icon || "⭐"}</b><div><strong>{item.name}</strong><small>Medalha do Quiz Bíblico</small></div></article>)}</div> : <div className="platform-empty-achievements"><span aria-hidden="true">✦</span><div><strong>Suas conquistas aparecerão aqui</strong><small>Participe das Jornadas do Quiz Bíblico para desbloquear medalhas.</small></div></div>}
      </section>

      <p className="platform-preview-note">Gemas, missão e baú são uma prévia visual e ainda não são persistidos.</p>
    </div>
  </main>;
}
