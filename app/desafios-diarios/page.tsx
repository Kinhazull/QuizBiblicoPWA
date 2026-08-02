"use client";

import { useEffect, useState } from "react";
import type { DailyObjectiveData } from "../PlatformHome";

function objectiveStatus(objective: DailyObjectiveData) {
  if (objective.status === "FINISHED") return "Concluído";
  if (objective.status === "STARTED") return "Em andamento";
  if (objective.status === "EXPIRED") return "Encerrado";
  return objective.availability === "AVAILABLE" ? "Não iniciado" : "Indisponível";
}

export default function DailyChallengesPage() {
  const [objectives, setObjectives] = useState<DailyObjectiveData[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadObjectives(signal?: AbortSignal) {
    return fetch("/api/platform/daily-objectives", { cache: "no-store", signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("load_failed")))
      .then(data => {
        setObjectives(Array.isArray(data.objectives) ? data.objectives : []);
        setError("");
      });
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
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 4000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function start(objective: DailyObjectiveData) {
    if (!objective.selectionId || !objective.playHref || objective.status !== "CREATED") return;
    setBusyId(objective.gameType);
    setError("");
    try {
      const response = await fetch("/api/platform/daily-objectives/start", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectionId: objective.selectionId }),
      });
      if (!response.ok) throw new Error("start_failed");
      location.href = objective.playHref;
    } catch {
      setError("Não foi possível iniciar este desafio.");
      setBusyId(null);
    }
  }

  const completed = objectives?.filter(item => item.status === "FINISHED").length || 0;

  return <main className="daily-challenges-page">
    <section className="daily-challenges-shell">
      <header className="platform-page-heading">
        <p>Objetivos do dia</p>
        <h1>Desafios <em>Diários</em></h1>
        <span>Uma oportunidade por jogo. Conclua no seu ritmo antes da renovação diária.</span>
      </header>

      <section className="daily-challenges-progress" aria-label="Resumo diário">
        <strong>{completed} de 7 concluídos</strong>
        <div className="platform-progress" role="progressbar" aria-valuemin={0} aria-valuemax={7} aria-valuenow={completed}>
          <i style={{ width: `${Math.round((completed / 7) * 100)}%` }} />
        </div>
      </section>

      {error ? <p className="daily-challenges-error" role="alert">{error}</p> : null}
      {!objectives ? <p className="daily-challenges-loading" role="status">Carregando desafios...</p> : null}
      <section className="daily-challenges-grid" aria-label="Jogos disponíveis hoje">
        {(objectives || []).map(objective => {
          const finished = objective.status === "FINISHED";
          const started = objective.status === "STARTED";
          const playable = objective.status === "CREATED" && objective.availability === "AVAILABLE" && Boolean(objective.selectionId && objective.playHref);
          return <article key={objective.gameType}>
            <span className={`daily-status ${finished ? "complete" : ""}`}>{objectiveStatus(objective)}</span>
            <h2>{objective.title}</h2>
            <p>{finished ? "Resultado registrado para hoje." : started ? "A partida iniciada está sendo finalizada. Este desafio não pode ser retomado." : "Uma partida única selecionada para você."}</p>
            <button
              disabled={!playable || finished || busyId === objective.gameType}
              onClick={() => start(objective)}
              type="button"
            >
              {finished ? "Concluído" : started ? "Finalizando..." : busyId === objective.gameType ? "Preparando..." : "Jogar"}
            </button>
          </article>;
        })}
      </section>
    </section>
  </main>;
}
