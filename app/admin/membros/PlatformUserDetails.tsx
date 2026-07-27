"use client";

import { useEffect, useState } from "react";
import styles from "./PlatformUserDetails.module.css";

type Props = { userId: string; userName: string; onClose: () => void };

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value) : "Sem registro";
}

function duration(value: number | null) {
  if (!value) return "Sem registro";
  const minutes = Math.floor(value / 60_000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export default function PlatformUserDetails({ userId, userName, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/platform`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) {
        if (response.status === 403) throw new Error("Você não possui permissão para consultar estes dados.");
        if (response.status === 404) throw new Error("Usuário não encontrado.");
        throw new Error("Não foi possível carregar os dados da plataforma.");
      }
      setData(await response.json());
    }).catch(reason => {
      if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Não foi possível carregar.");
    });
    return () => controller.abort();
  }, [userId]);

  return <aside className={styles.panel} aria-labelledby="platform-user-title">
    <header className={styles.header}>
      <div><span className="eyebrow">DADOS DA PLATAFORMA</span><h2 id="platform-user-title">{userName}</h2><p>Visão consolidada e somente leitura.</p></div>
      <button className={styles.close} type="button" onClick={onClose} aria-label="Fechar dados da plataforma">×</button>
    </header>
    {!data && !error && <p className={styles.state} role="status" aria-live="polite">Carregando dados da plataforma…</p>}
    {error && <p className={`${styles.state} ${styles.error}`} role="alert">{error}</p>}
    {data && <div className={styles.sections}>
      <section className={styles.section} aria-labelledby="platform-account"><h3 id="platform-account">Conta</h3>
        <dl className={styles.metrics}>
          <div><dt>Nome</dt><dd>{data.account.displayName}</dd></div><div><dt>Usuário</dt><dd>@{data.account.username}</dd></div>
          <div><dt>Função</dt><dd>{data.account.role}</dd></div><div><dt>Status</dt><dd>{data.account.status}</dd></div>
          <div><dt>Criada em</dt><dd>{date(data.account.createdAt)}</dd></div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="platform-progress"><h3 id="platform-progress">Progressão</h3>
        <dl className={styles.metrics}>
          <div><dt>Nível</dt><dd>{data.progress.level}</dd></div><div><dt>XP total</dt><dd>{data.progress.totalXp}</dd></div>
          <div><dt>XP no nível</dt><dd>{data.progress.levelProgress.currentXp}</dd></div>
          <div><dt>Próximo nível</dt><dd>{data.progress.levelProgress.targetXp} XP</dd></div>
          <div><dt>Progresso</dt><dd>{data.progress.levelProgress.percent}%</dd></div><div><dt>Moedas</dt><dd>{data.progress.coins}</dd></div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="platform-statistics"><h3 id="platform-statistics">Estatísticas gerais</h3>
        <dl className={styles.metrics}>
          <div><dt>Sessões concluídas</dt><dd>{data.statistics.global.sessionsCompleted}</dd></div>
          <div><dt>Jogos utilizados</dt><dd>{data.statistics.global.gamesUsed}</dd></div>
          <div><dt>Tempo total</dt><dd>{duration(data.statistics.global.totalPlayTimeMs)}</dd></div>
          <div><dt>Última atividade</dt><dd>{date(data.statistics.global.lastActivityAt)}</dd></div>
          <div><dt>Dias ativos</dt><dd>{data.statistics.global.activeDays}</dd></div>
          <div><dt>Sequência atual / melhor</dt><dd>{data.statistics.global.currentDailyStreak} / {data.statistics.global.bestDailyStreak}</dd></div>
          <div><dt>Partidas oficiais</dt><dd>{data.statistics.global.officialGamesCompleted}</dd></div>
          <div><dt>Perguntas respondidas</dt><dd>{data.statistics.global.questionsAnswered}</dd></div>
          <div><dt>Partidas perfeitas</dt><dd>{data.statistics.global.perfectGames}</dd></div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="platform-games"><h3 id="platform-games">Estatísticas por jogo</h3>
        {data.statistics.games.length ? <ul className={styles.list}>{data.statistics.games.map((game: any) =>
          <li key={game.gameId}><strong>{game.gameName}</strong><small>{game.sessionsCompleted} concluída(s) · {game.correctAnswers} acerto(s) · {game.incorrectAnswers} erro(s) · Precisão {game.accuracy ?? "—"}% · Melhor {game.bestScore ?? "—"} · Média {duration(game.averageTimeMs)}</small></li>)}</ul>
          : <p className={styles.empty}>Nenhuma atividade por jogo.</p>}
      </section>
      <section className={styles.section} aria-labelledby="platform-achievements"><h3 id="platform-achievements">Conquistas</h3>
        <p>{data.achievements.summary.unlocked} desbloqueada(s) de {data.achievements.summary.total}; {data.achievements.summary.pending} pendente(s).</p>
        {data.achievements.unlocked.length ? <ul className={styles.list}>{data.achievements.unlocked.map((item: any) =>
          <li key={item.code}><strong>{item.name}</strong><small>{item.scopeType === "game" ? item.gameId : "Global"} · {date(item.unlockedAt)}</small></li>)}</ul>
          : <p className={styles.empty}>Nenhuma conquista desbloqueada.</p>}
      </section>
      <section className={styles.section} aria-labelledby="platform-inventory"><h3 id="platform-inventory">Inventário</h3>
        {data.inventory.length ? <ul className={styles.list}>{data.inventory.map((item: any) =>
          <li key={item.id}><strong>{item.name}</strong><small>{item.category}{!item.known ? ` · ${item.id}` : ""}</small></li>)}</ul>
          : <p className={styles.empty}>Nenhum item adquirido.</p>}
      </section>
      <section className={styles.section} aria-labelledby="platform-equipment"><h3 id="platform-equipment">Equipamentos</h3>
        <dl className={styles.metrics}><div><dt>Avatar</dt><dd>{data.equipment.avatar?.name || "Não equipado"}</dd></div><div><dt>Moldura</dt><dd>{data.equipment.frame?.name || "Não equipada"}</dd></div></dl>
      </section>
      <section className={styles.section} aria-labelledby="platform-missions"><h3 id="platform-missions">Missões</h3>
        {(["daily", "weekly"] as const).map(cadence => {
          const mission = data.missions[cadence];
          const label = cadence === "daily" ? "Missão diária" : "Missão semanal";
          return mission ? <div key={cadence}>
            <strong>{label}: {mission.name}</strong>
            <dl className={styles.metrics}>
              <div><dt>Progresso</dt><dd>{mission.progress} / {mission.target} {mission.progressUnit}</dd></div>
              <div><dt>Concluída</dt><dd>{mission.state === "completed" || mission.state === "claimed" ? "Sim" : "Não"}</dd></div>
              <div><dt>Recompensa</dt><dd>{mission.reward.label}</dd></div>
              <div><dt>Reset</dt><dd>{date(mission.expiresAt)}</dd></div>
            </dl>
          </div> : <p className={styles.empty} key={cadence}>Nenhuma {label.toLocaleLowerCase("pt-BR")} vigente.</p>;
        })}
      </section>
      <section className={styles.section} aria-labelledby="platform-retention"><h3 id="platform-retention">Retenção</h3>
        <dl className={styles.metrics}>
          <div><dt>Sequência atual</dt><dd>{data.retention.currentStreak} dia(s)</dd></div>
          <div><dt>Maior sequência</dt><dd>{data.retention.bestStreak} dia(s)</dd></div>
          <div><dt>Dias ativos</dt><dd>{data.retention.activeDays}</dd></div>
          <div><dt>Último acesso</dt><dd>{date(data.retention.lastAccessAt)}</dd></div>
          <div><dt>Conta criada em</dt><dd>{date(data.retention.createdAt)}</dd></div>
        </dl>
      </section>
      <section className={styles.section} aria-labelledby="platform-daily-chest"><h3 id="platform-daily-chest">Cofre diário</h3>
        <dl className={styles.metrics}>
          <div><dt>Disponível</dt><dd>{data.dailyChest.available ? "Sim" : "Não"}</dd></div>
          <div><dt>Último resgate</dt><dd>{date(data.dailyChest.lastClaimedAt)}</dd></div>
          <div><dt>Próximo horário</dt><dd>{date(data.dailyChest.nextAvailableAt)}</dd></div>
          <div><dt>Última recompensa</dt><dd>{data.dailyChest.lastReward?.label || "Sem registro"}</dd></div>
        </dl>
      </section>
    </div>}
  </aside>;
}
