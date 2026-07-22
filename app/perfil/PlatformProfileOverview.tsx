"use client";

import { useEffect, useState } from "react";

type ProgressResponse = {
  progress: {
    level: number;
    totalXp: number;
    coins: number;
    levelProgress: { currentXp: number; targetXp: number; percent: number };
  };
};

type StatisticsResponse = {
  global: {
    sessionsCompleted: number;
    gamesUsed: number;
    activeDays: number;
    currentDailyStreak: number;
    officialGamesCompleted: number;
    questionsAnswered: number;
    perfectGames: number;
    distinctOfficialPlayDaysUtc: number;
  };
  games: Array<{ gameId: string; sessionsCompleted: number }>;
};

type AchievementsResponse = { summary: { total: number; unlocked: number; pending: number } };

type Mission = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  state: "active" | "completed" | "claimed" | "expired";
  progress: number;
  target: number;
  progressUnit: string;
  reward: { label: string };
};

type ProfilePlatformData = {
  progress: ProgressResponse["progress"];
  statistics: StatisticsResponse;
  achievements: AchievementsResponse["summary"];
  missions: Mission[];
};

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (response.status === 401) {
    location.replace("/");
    throw new Error("unauthenticated");
  }
  if (!response.ok) throw new Error(`request_failed:${url}:${response.status}`);
  return response.json() as Promise<T>;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function missionState(state: Mission["state"]) {
  return ({ active: "Em andamento", completed: "Pronta para resgate", claimed: "Resgatada", expired: "Expirada" })[state];
}

export function PlatformProfileOverview() {
  const [data, setData] = useState<ProfilePlatformData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    Promise.all([
      readJson<ProgressResponse>("/api/platform/progress", controller.signal),
      readJson<StatisticsResponse>("/api/platform/statistics", controller.signal),
      readJson<AchievementsResponse>("/api/platform/achievements", controller.signal),
      readJson<{ mission: Mission | null }>("/api/platform/missions/current", controller.signal),
    ]).then(([progress, statistics, achievements, mission]) => {
      setData({
        progress: progress.progress,
        statistics,
        achievements: achievements.summary,
        missions: mission.mission ? [mission.mission] : [],
      });
      setStatus("ready");
    }).catch(error => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof Error && error.message === "unauthenticated") return;
      setStatus("error");
    });
    return () => controller.abort();
  }, [reloadKey]);

  if (status === "loading") return <section className="platform-profile-overview" aria-busy="true" aria-labelledby="platform-profile-title">
    <header><p>PROGRESSO GLOBAL</p><h2 id="platform-profile-title">Sua jornada na plataforma</h2></header>
    <div className="platform-profile-skeleton" role="status" aria-live="polite"><span>Carregando seu progresso...</span><i /><i /><i /></div>
  </section>;

  if (status === "error" || !data) return <section className="platform-profile-overview" aria-labelledby="platform-profile-title">
    <header><p>PROGRESSO GLOBAL</p><h2 id="platform-profile-title">Sua jornada na plataforma</h2></header>
    <div className="platform-profile-error" role="alert"><strong>Não foi possível carregar seu progresso.</strong><span>Verifique sua conexão e tente novamente.</span><button type="button" onClick={() => setReloadKey(value => value + 1)}>Tentar novamente</button></div>
  </section>;

  const { progress, statistics, achievements, missions } = data;
  const remainingXp = Math.max(0, progress.levelProgress.targetXp - progress.levelProgress.currentXp);
  const global = statistics.global;
  const hasActivity = global.sessionsCompleted > 0 || global.officialGamesCompleted > 0 || global.questionsAnswered > 0;

  return <section className="platform-profile-overview" aria-labelledby="platform-profile-title">
    <header><div><p>PROGRESSO GLOBAL</p><h2 id="platform-profile-title">Sua jornada na plataforma</h2></div><span className="platform-profile-level">Nível {progress.level}</span></header>

    <div className="platform-profile-progress-card">
      <div className="platform-profile-level-mark" aria-hidden="true">{progress.level}</div>
      <div className="platform-profile-xp">
        <span><strong>{formatNumber(progress.levelProgress.currentXp)} XP</strong><small>{formatNumber(remainingXp)} XP para o próximo nível</small></span>
        <div className="platform-profile-progress-track" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.levelProgress.percent}><i style={{ width: `${progress.levelProgress.percent}%` }} /></div>
        <small>{formatNumber(progress.totalXp)} XP acumulados</small>
      </div>
      <div className="platform-profile-balance"><span aria-hidden="true">●</span><strong>{formatNumber(progress.coins)}</strong><small>moedas</small></div>
    </div>

    <div className="platform-profile-summary" aria-label="Resumo da plataforma">
      <article><small>Partidas oficiais</small><strong>{formatNumber(global.officialGamesCompleted)}</strong><span>concluídas</span></article>
      <article><small>Perguntas</small><strong>{formatNumber(global.questionsAnswered)}</strong><span>respondidas</span></article>
      <article><small>Partidas perfeitas</small><strong>{formatNumber(global.perfectGames)}</strong><span>sem erros</span></article>
      <article><small>Dias ativos</small><strong>{formatNumber(global.distinctOfficialPlayDaysUtc || global.activeDays)}</strong><span>na plataforma</span></article>
      <article><small>Conquistas</small><strong>{formatNumber(achievements.unlocked)}</strong><span>de {formatNumber(achievements.total)}</span></article>
    </div>

    {!hasActivity && <p className="platform-profile-empty">Seu histórico começará a aparecer depois da primeira partida oficial concluída.</p>}

    <div className="platform-profile-missions">
      <header><div><p>MISSÕES ATUAIS</p><h3>Continue avançando</h3></div><span>{missions.length}</span></header>
      {missions.length === 0 ? <p className="platform-profile-empty">Nenhuma missão disponível agora. Volte mais tarde para conferir novos objetivos.</p> : missions.map(mission => {
        const percent = Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100));
        return <article key={mission.id}>
          <span className="platform-profile-mission-icon" aria-hidden="true">{mission.icon || "◎"}</span>
          <div><strong>{mission.name}</strong><p>{mission.description}</p><div className="platform-profile-mission-track" role="progressbar" aria-label={`Progresso da missão ${mission.name}`} aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={mission.progress}><i style={{ width: `${percent}%` }} /></div><small>{formatNumber(mission.progress)} de {formatNumber(mission.target)} {mission.progressUnit}</small></div>
          <aside><b>{missionState(mission.state)}</b><span>{mission.reward.label}</span></aside>
        </article>;
      })}
    </div>
  </section>;
}
