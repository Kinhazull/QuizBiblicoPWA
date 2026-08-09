"use client";

import { useEffect, useMemo, useState } from "react";
import { EquippedAvatar, type EquipmentView } from "../EquippedAvatar";
import { gameModules } from "../games/sdk/gameModules";

type ProgressResponse = {
  progress: {
    level: number;
    totalXp: number;
    coins: number;
    levelProgress: { currentXp: number; targetXp: number; percent: number };
  };
};

type GameStatistic = {
  gameId: string;
  sessionsStarted: number;
  sessionsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number | null;
  bestScore: number | null;
  lastActivityAt: number | null;
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
  games: GameStatistic[];
};

type CollectionItem = { id: string; name: string; icon: string; category: "avatar" | "frame"; owned: boolean; equipped: boolean };
type CollectionView = {
  id: string;
  name: string;
  coverIcon: string;
  progress: { acquired: number; total: number; percent: number; status: "IN_PROGRESS" | "COMPLETE" };
  items: CollectionItem[];
};
type AchievementView = {
  code: string;
  name: string;
  description: string;
  icon: string | null;
  secret: boolean;
  unlocked: boolean;
  unlockedAt: number | null;
  state: "LOCKED" | "IN_PROGRESS" | "UNLOCKED";
};
type CollectionsResponse = {
  summary: { ownedCollectibles: number; collectibles: number; unlockedAchievements: number; achievements: number };
  collections: CollectionView[];
  achievements: AchievementView[];
  equipment: EquipmentView["equipped"];
};

type ProfilePlatformData = {
  progress: ProgressResponse["progress"];
  statistics: StatisticsResponse;
  collections: CollectionsResponse;
  equipment: EquipmentView;
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

function equipmentView(collections: CollectionsResponse): EquipmentView {
  return {
    equipped: collections.equipment,
    items: collections.collections.flatMap(collection => collection.items).map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      icon: item.icon,
      equipped: item.equipped,
    })),
  };
}

export function PlatformProfileOverview({ displayName }: { displayName: string }) {
  const [data, setData] = useState<ProfilePlatformData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const refreshEquipment = () => setReloadKey(value => value + 1);
    window.addEventListener("platform-equipment-changed", refreshEquipment);
    return () => window.removeEventListener("platform-equipment-changed", refreshEquipment);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    Promise.all([
      readJson<ProgressResponse>("/api/platform/progress", controller.signal),
      readJson<StatisticsResponse>("/api/platform/statistics", controller.signal),
      readJson<CollectionsResponse>("/api/platform/collections", controller.signal),
    ]).then(([progress, statistics, collections]) => {
      setData({ progress: progress.progress, statistics, collections, equipment: equipmentView(collections) });
      setStatus("ready");
    }).catch(error => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof Error && error.message === "unauthenticated") return;
      setStatus("error");
    });
    return () => controller.abort();
  }, [reloadKey]);

  const gameStatistics = useMemo(() => {
    const byId = new Map(data?.statistics.games.map(game => [game.gameId, game]) || []);
    return gameModules.map(game => ({
      ...game,
      statistic: byId.get(game.id) || null,
    }));
  }, [data]);

  if (status === "loading") return <section className="platform-profile-overview" aria-busy="true" aria-labelledby="platform-profile-title">
    <header><p>IDENTIDADE DO JOGADOR</p><h2 id="platform-profile-title">Preparando seu perfil</h2></header>
    <div className="platform-profile-skeleton" role="status" aria-live="polite"><span>Carregando sua jornada...</span><i /><i /><i /></div>
  </section>;

  if (status === "error" || !data) return <section className="platform-profile-overview" aria-labelledby="platform-profile-title">
    <header><p>IDENTIDADE DO JOGADOR</p><h2 id="platform-profile-title">Seu perfil</h2></header>
    <div className="platform-profile-error" role="alert"><strong>Não foi possível carregar sua jornada.</strong><span>Verifique sua conexão e tente novamente.</span><button type="button" onClick={() => setReloadKey(value => value + 1)}>Tentar novamente</button></div>
  </section>;

  const { progress, statistics, collections, equipment } = data;
  const global = statistics.global;
  const remainingXp = Math.max(0, progress.levelProgress.targetXp - progress.levelProgress.currentXp);
  const mostPlayed = [...gameStatistics]
    .filter(game => Number(game.statistic?.sessionsCompleted || 0) > 0)
    .sort((left, right) => Number(right.statistic?.sessionsCompleted || 0) - Number(left.statistic?.sessionsCompleted || 0))[0] || null;
  const recentAchievements = collections.achievements
    .filter(item => item.unlocked && item.unlockedAt !== null)
    .sort((left, right) => Number(right.unlockedAt) - Number(left.unlockedAt))
    .slice(0, 3);
  const equippedItems = equipment.items.filter(item => item.equipped);

  return <section className="platform-profile-overview" aria-labelledby="platform-profile-title">
    <header className="platform-profile-identity">
      <EquippedAvatar displayName={displayName} equipment={equipment} size="large" />
      <div className="platform-profile-identity-copy"><p>IDENTIDADE DO JOGADOR</p><h2 id="platform-profile-title">{displayName}</h2><span>{equippedItems.length ? equippedItems.map(item => item.name).join(" · ") : "Sua jornada, do seu jeito."}</span></div>
      <div className="platform-profile-identity-level"><strong>Nível {progress.level}</strong><span>🔥 {global.currentDailyStreak} dia{global.currentDailyStreak === 1 ? "" : "s"} de sequência</span></div>
    </header>

    <section className="platform-profile-progress-card" aria-labelledby="profile-progress-title">
      <div className="platform-profile-level-mark" aria-hidden="true">{progress.level}</div>
      <div className="platform-profile-xp"><span><strong id="profile-progress-title">{formatNumber(progress.levelProgress.currentXp)} XP neste nível</strong><small>{formatNumber(remainingXp)} XP para o próximo</small></span><div className="platform-profile-progress-track" role="progressbar" aria-label="Progresso para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.levelProgress.percent}><i style={{ width: `${progress.levelProgress.percent}%` }} /></div><small>{formatNumber(progress.totalXp)} XP conquistados no total</small></div>
      <div className="platform-profile-balance"><span aria-hidden="true">●</span><strong>{formatNumber(progress.coins)}</strong><small>moedas</small></div>
    </section>

    <section aria-labelledby="profile-journey-title">
      <div className="platform-profile-section-heading"><div><p>SUA JORNADA</p><h3 id="profile-journey-title">Um retrato do seu caminho</h3></div>{mostPlayed ? <span>Mais jogado: <strong>{mostPlayed.name}</strong></span> : null}</div>
      <div className="platform-profile-summary" aria-label="Resumo da jornada">
        <article><small>Partidas concluídas</small><strong>{formatNumber(global.sessionsCompleted)}</strong><span>em todos os modos</span></article>
        <article><small>XP total</small><strong>{formatNumber(progress.totalXp)}</strong><span>acumulados</span></article>
        <article><small>Conquistas</small><strong>{formatNumber(collections.summary.unlockedAchievements)}/{formatNumber(collections.summary.achievements)}</strong><span>desbloqueadas</span></article>
        <article><small>Colecionáveis</small><strong>{formatNumber(collections.summary.ownedCollectibles)}/{formatNumber(collections.summary.collectibles)}</strong><span>adquiridos</span></article>
        <article><small>Dias ativos</small><strong>{formatNumber(global.distinctOfficialPlayDaysUtc || global.activeDays)}</strong><span>na plataforma</span></article>
      </div>
    </section>

    <section className="platform-profile-games" aria-labelledby="profile-games-title">
      <div className="platform-profile-section-heading"><div><p>SEUS JOGOS</p><h3 id="profile-games-title">Sete maneiras de avançar</h3></div></div>
      <div className="platform-profile-game-grid">{gameStatistics.map(game => {
        const statistic = game.statistic;
        return <article key={game.id} className={mostPlayed?.id === game.id ? "is-favorite" : ""}>
          <span className="platform-profile-game-icon" aria-hidden="true">{game.image}</span>
          <div><h4>{game.name}</h4><strong>{formatNumber(statistic?.sessionsCompleted || 0)}</strong><small>partida{statistic?.sessionsCompleted === 1 ? "" : "s"} concluída{statistic?.sessionsCompleted === 1 ? "" : "s"}</small></div>
          {statistic?.questionsAnswered ? <span className="platform-profile-game-detail">{formatNumber(statistic.accuracy || 0)}% de acertos</span> : statistic?.sessionsStarted ? <span className="platform-profile-game-detail">{formatNumber(statistic.sessionsStarted)} iniciada{statistic.sessionsStarted === 1 ? "" : "s"}</span> : <span className="platform-profile-game-detail">Pronto para começar</span>}
        </article>;
      })}</div>
    </section>

    <section className="platform-profile-rewards" aria-labelledby="profile-rewards-title">
      <div className="platform-profile-section-heading"><div><p>FEITOS E COLEÇÕES</p><h3 id="profile-rewards-title">O que já faz parte da sua história</h3></div><a href="/recompensas">Ver todas as recompensas</a></div>
      <div className="platform-profile-reward-grid">
        <article className="platform-profile-achievements"><header><strong>Conquistas em destaque</strong><span>{collections.summary.unlockedAchievements}/{collections.summary.achievements}</span></header>{recentAchievements.length ? <ul>{recentAchievements.map(item => <li key={item.code}><span aria-hidden="true">{item.icon || "✦"}</span><div><strong>{item.name}</strong><small>Conquistada em <time dateTime={new Date(item.unlockedAt as number).toISOString()}>{new Date(item.unlockedAt as number).toLocaleDateString("pt-BR")}</time></small></div></li>)}</ul> : <p className="platform-profile-empty">Suas conquistas aparecerão aqui conforme você avança.</p>}</article>
        <article className="platform-profile-collections"><header><strong>Suas coleções</strong><span>{collections.summary.ownedCollectibles}/{collections.summary.collectibles}</span></header>{collections.collections.map(collection => <div key={collection.id}><span aria-hidden="true">{collection.coverIcon}</span><div><strong>{collection.name}</strong><progress max={collection.progress.total} value={collection.progress.acquired} aria-label={`${collection.name}: ${collection.progress.acquired} de ${collection.progress.total}`} /><small>{collection.progress.acquired} de {collection.progress.total} itens</small></div></div>)}</article>
      </div>
    </section>
  </section>;
}
