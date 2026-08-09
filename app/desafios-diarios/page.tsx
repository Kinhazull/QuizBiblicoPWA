"use client";

import { useEffect, useState } from "react";
import type { DailyChallengeData, DailyObjectiveData } from "../PlatformHome";

const STATUS_LABEL = {
  AVAILABLE: "Disponível",
  WON: "Vencido",
  LOST: "Encerrado",
  UNAVAILABLE: "Indisponível",
} as const;

export default function DailyChallengesPage() {
  const [daily, setDaily] = useState<DailyChallengeData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [celebration, setCelebration] = useState("");

  async function loadObjectives(signal?: AbortSignal) {
    const response = await fetch("/api/platform/daily-objectives", { cache: "no-store", signal });
    if (!response.ok) throw new Error("load_failed");
    const data = await response.json();
    setDaily(data);
    setBusyId(null);
    setError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => void loadObjectives(controller.signal).catch(cause => {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("Não foi possível carregar os desafios de hoje.");
      }
    });
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function start(objective: DailyObjectiveData) {
    if (!objective.selectionId || !objective.playHref || objective.state !== "AVAILABLE") return;
    setBusyId(objective.gameType);
    setError("");
    try {
      const response = await fetch("/api/platform/daily-objectives/start", {
        method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectionId: objective.selectionId }),
      });
      if (!response.ok) throw new Error("start_failed");
      location.assign(objective.playHref);
    } catch {
      setError("Não foi possível iniciar este desafio.");
      setBusyId(null);
      await loadObjectives().catch(() => undefined);
    }
  }

  async function claim(target: 3 | 7) {
    setClaiming(target);
    setError("");
    try {
      const response = await fetch("/api/platform/daily-objectives/rewards", {
        method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "claim_failed");
      setDaily(data.daily);
      setCelebration(`Recompensa de ${target}/7 resgatada!`);
      window.setTimeout(() => setCelebration(""), 4000);
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "daily_reward_locked"
        ? "Essa recompensa ainda não foi desbloqueada."
        : "Não foi possível resgatar a recompensa.");
      await loadObjectives().catch(() => undefined);
    } finally {
      setClaiming(null);
    }
  }

  return <main className="daily-challenges-page">
    <section className="daily-challenges-shell">
      <header className="platform-page-heading">
        <p>Objetivos do dia</p>
        <h1>Desafios <em>Diários</em></h1>
        <span>Vença jogos diferentes hoje e desbloqueie recompensas.</span>
      </header>

      <section className="daily-challenges-progress" aria-labelledby="daily-progress-title">
        <div><strong id="daily-progress-title">{daily?.wins || 0} de 7 vitórias</strong><span>{daily ? `${daily.played} tentativa(s) encerrada(s)` : "Preparando o dia..."}</span></div>
        <div className="platform-progress" role="progressbar" aria-label="Vitórias nos desafios diários" aria-valuemin={0} aria-valuemax={7} aria-valuenow={daily?.wins || 0}>
          <i style={{ width: `${Math.round(((daily?.wins || 0) / 7) * 100)}%` }} />
        </div>
        <div className="daily-seven-markers" aria-label="Estado dos sete jogos">
          {(daily?.objectives || Array.from({ length: 7 })).map((objective, index) => {
            const state = objective && "state" in objective ? objective.state : "AVAILABLE";
            return <span className={state.toLowerCase()} key={objective && "gameType" in objective ? objective.gameType : index}>
              <i aria-hidden="true">{state === "WON" ? "✓" : state === "LOST" ? "×" : state === "UNAVAILABLE" ? "!" : index + 1}</i>
              <b>{objective && "title" in objective ? objective.title.replace(" Diário", "") : `Jogo ${index + 1}`}</b>
              <small>{STATUS_LABEL[state]}</small>
            </span>;
          })}
        </div>
      </section>

      <section className="daily-reward-grid" aria-label="Recompensas dos desafios diários">
        {(daily?.rewards || []).map(milestone => <article className={milestone.state.toLowerCase()} key={milestone.target} aria-live={milestone.state === "READY" ? "polite" : undefined}>
          <span aria-hidden="true">{milestone.target === 7 ? "🏆" : "🎁"}</span>
          <div><strong>{milestone.target} vitórias</strong><small>{milestone.reward.label}</small><em>{milestone.state === "CLAIMED" ? "Resgatada" : milestone.state === "READY" ? "Pronta para resgatar" : `${Math.min(daily?.wins || 0, milestone.target)}/${milestone.target}`}</em></div>
          {milestone.state === "READY"
            ? <button type="button" disabled={claiming !== null} onClick={() => claim(milestone.target)}>{claiming === milestone.target ? "Resgatando..." : "Resgatar"}</button>
            : <span className="daily-reward-state">{milestone.state === "CLAIMED" ? "Concluído ✓" : "Bloqueada"}</span>}
        </article>)}
      </section>

      {celebration ? <p className="daily-celebration" role="status">✨ {celebration}</p> : null}
      {error ? <p className="daily-challenges-error" role="alert">{error}</p> : null}
      {!daily ? <p className="daily-challenges-loading" role="status">Carregando desafios...</p> : null}
      <section className="daily-challenges-grid" aria-label="Jogos disponíveis hoje">
        {(daily?.objectives || []).map(objective => {
          const playable = objective.state === "AVAILABLE" && Boolean(objective.selectionId && objective.playHref);
          return <article className={`daily-game-${objective.state.toLowerCase()}`} key={objective.gameType}>
            <span className={`daily-status ${objective.state.toLowerCase()}`}>{STATUS_LABEL[objective.state]}</span>
            <h2>{objective.title}</h2>
            <p>{objective.state === "WON" ? "Vitória registrada para hoje." : objective.state === "LOST" ? "Sua tentativa de hoje foi encerrada." : objective.state === "UNAVAILABLE" ? "Conteúdo indisponível. Tente novamente mais tarde." : "Uma tentativa única selecionada para você."}</p>
            <button disabled={!playable || busyId === objective.gameType} onClick={() => start(objective)} type="button">
              {objective.state === "WON" ? "Concluído ✓" : objective.state === "LOST" ? "Encerrado" : objective.state === "UNAVAILABLE" ? "Indisponível" : busyId === objective.gameType ? "Preparando..." : "Jogar"}
            </button>
          </article>;
        })}
      </section>
    </section>
  </main>;
}
