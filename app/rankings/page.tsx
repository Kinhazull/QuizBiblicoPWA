"use client";

import { useEffect, useMemo, useState } from "react";
import { COLLECTIBLE_CATALOG } from "../../shared/platform-collections";
import { EquippedAvatar, type EquipmentView } from "../EquippedAvatar";
import { PlatformIllustration } from "../PlatformIllustration";
import styles from "./rankings.module.css";

type Scope = "overall" | "weekly" | "game";
type GameOption = { id: string; name: string; available: boolean; criterion: string | null };
type Entry = {
  position: number;
  displayName: string;
  level: number;
  totalXp: number;
  value: number;
  sessionsCompleted: number | null;
  equipment: { avatar: string | null; frame: string | null };
  isCurrentUser: boolean;
};
type RankingResponse = {
  scope: Scope;
  gameId?: string;
  criterion: string | null;
  unavailableReason?: string;
  entries: Entry[];
  me: Entry | null;
  games: GameOption[];
  period?: { from: number; to: number; timeZone: string };
  valueFormat?: "points" | "percentage";
};

function equipmentView(entry: Entry): EquipmentView {
  return {
    equipped: entry.equipment,
    items: COLLECTIBLE_CATALOG.filter(item => item.id === entry.equipment.avatar || item.id === entry.equipment.frame)
      .map(item => ({ id: item.id, category: item.category, name: item.name, icon: item.icon, equipped: true })),
  };
}

function format(value: number) { return Number(value || 0).toLocaleString("pt-BR"); }

function RankingLine({ entry, scope, valueFormat }: { entry: Entry; scope: Scope; valueFormat?: "points" | "percentage" }) {
  const medal = entry.position <= 3 ? ["🥇", "🥈", "🥉"][entry.position - 1] : null;
  return <article className={`${styles.row} ${entry.isCurrentUser ? styles.own : ""}`} data-position={entry.position}>
    <strong className={styles.position}>{medal || `${entry.position}º`}</strong>
    <EquippedAvatar displayName={entry.displayName} equipment={equipmentView(entry)} />
    <div className={styles.identity}><strong>{entry.displayName}{entry.isCurrentUser ? <small>VOCÊ</small> : null}</strong><span>Nível {entry.level}{scope === "game" && entry.sessionsCompleted ? ` · ${entry.sessionsCompleted} partidas` : ""}</span></div>
    <div className={styles.score}><strong>{format(entry.value)}{valueFormat === "percentage" ? "%" : ""}</strong><span>{scope === "game" ? valueFormat === "percentage" ? "desempenho" : "pontos" : "XP"}</span></div>
  </article>;
}

export default function Rankings() {
  const [scope, setScope] = useState<Scope>("overall");
  const [gameId, setGameId] = useState("quiz-biblico");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    const query = new URLSearchParams({ scope, limit: "10" });
    if (scope === "game") query.set("gameId", gameId);
    fetch(`/api/platform/rankings?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { location.replace("/"); return null; }
      if (!response.ok) throw new Error("ranking_request_failed");
      return response.json() as Promise<RankingResponse>;
    }).then(result => { if (result) { setData(result); setStatus("ready"); } })
      .catch(error => { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("error"); });
    return () => controller.abort();
  }, [scope, gameId, reload]);

  const ownOutsideTop = useMemo(() => data?.me && !data.entries.some(entry => entry.isCurrentUser) ? data.me : null, [data]);
  const selectedGame = data?.games.find(game => game.id === gameId);

  return <main className={styles.page}>
    <header className={styles.hero}><p>CLASSIFICAÇÃO DA PLATAFORMA</p><h1>Ranking <em>Universal</em></h1><span>Veja sua evolução entre os participantes da sua organização.</span></header>
    <nav className={styles.tabs} aria-label="Categorias do ranking">
      {([['overall', 'Geral'], ['weekly', 'Semanal'], ['game', 'Por jogo']] as const).map(([key, label]) => <button key={key} type="button" className={scope === key ? styles.active : ""} aria-pressed={scope === key} onClick={() => setScope(key)}>{label}</button>)}
    </nav>
    {scope === "game" ? <section className={styles.gamePicker} aria-labelledby="game-ranking-title"><label id="game-ranking-title" htmlFor="ranking-game">Escolha o jogo</label><select id="ranking-game" value={gameId} onChange={event => setGameId(event.target.value)}>{(data?.games || []).map(game => <option key={game.id} value={game.id}>{game.name}{game.available ? "" : " — em preparação"}</option>)}</select></section> : null}

    <section className={styles.board} aria-busy={status === "loading"} aria-live="polite">
      <header><PlatformIllustration id="ranking-podium" className={styles.podiumArt} /><div><p>{scope === "overall" ? "XP TOTAL" : scope === "weekly" ? "SEMANA ATUAL" : selectedGame?.name || "POR JOGO"}</p><h2>Top 10</h2></div>{data?.criterion ? <span>{data.criterion}</span> : null}</header>
      {status === "loading" ? <div className={styles.state} role="status">Carregando classificação…</div> : null}
      {status === "error" ? <div className={styles.state} role="alert"><strong>Não foi possível carregar o ranking.</strong><button type="button" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div> : null}
      {status === "ready" && data?.unavailableReason ? <div className={styles.state}><strong>Ranking em preparação</strong><p>{data.unavailableReason}</p></div> : null}
      {status === "ready" && data && !data.unavailableReason && !data.entries.length ? <div className={styles.state}><strong>A classificação começa com a primeira participação.</strong><p>Jogue e conquiste seu lugar.</p></div> : null}
      {status === "ready" && data && !data.unavailableReason ? <div className={styles.list}>{data.entries.map(entry => <RankingLine key={`${entry.position}-${entry.displayName}`} entry={entry} scope={scope} valueFormat={data.valueFormat} />)}</div> : null}
    </section>
    {status === "ready" && ownOutsideTop && data ? <section className={styles.myPosition} aria-labelledby="my-ranking-position"><p id="my-ranking-position">SUA POSIÇÃO</p><RankingLine entry={ownOutsideTop} scope={scope} valueFormat={data.valueFormat} /></section> : null}
    <p className={styles.privacy}>Somente seu nome público, nível e identidade equipada aparecem aqui. A classificação é restrita à sua organização.</p>
  </main>;
}
