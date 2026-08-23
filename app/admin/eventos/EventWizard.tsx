"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { gameModules } from "../../games/sdk/gameModules";

const STEPS = ["Informações", "Jogos", "Conteúdos", "Regras", "Recompensas", "Aparência", "Revisão", "Agendamento"] as const;
const GAMES = gameModules.map(game => ({ id: game.id, name: game.name, icon: game.image,
  required: game.id === "quiz-biblico" ? 5 : game.id === "memoria-biblica" ? 3 : 1 }));

type ContentOption = { contentId: string; contentVersion: number; title: string; category: string; difficulty: string; themes: string[]; biblicalReference: string | null };
type SelectedContent = Pick<ContentOption, "contentId" | "contentVersion" | "title">;
type AdminEvent = { id: string; title: string; description: string; coverAssetId: string | null; status: string; startsAt: number; endsAt: number; timeZone: string; completionRule: string; minimumParticipations: number; rewards: Rewards; games: Array<{ gameType: string; contents: ContentOption[] }> };
type Asset = { id: string; title: string; source_url: string; alt_text: string; status: string; type: string };
type Rewards = { participationXp: number; victoryCoins: number; completionBonusXp: number; perfectBonusCoins: number };
type Draft = { title: string; description: string; selectedGames: string[]; contents: Record<string, SelectedContent[]>; completionRule: "ALL" | "MINIMUM"; minimumParticipations: number; rewards: Rewards; coverAssetId: string; startsAt: string; endsAt: string; timeZone: string };

const initialDraft = (): Draft => ({ title: "", description: "", selectedGames: [], contents: {}, completionRule: "ALL", minimumParticipations: 1,
  rewards: { participationXp: 0, victoryCoins: 0, completionBonusXp: 0, perfectBonusCoins: 0 }, coverAssetId: "", startsAt: "", endsAt: "", timeZone: "America/Sao_Paulo" });
const localDate = (value: number) => { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(value - offset).toISOString().slice(0, 16); };
const game = (id: string) => GAMES.find(item => item.id === id)!;

export function EventWizard() {
  const [step, setStep] = useState(0); const [draft, setDraft] = useState<Draft>(initialDraft);
  const [events, setEvents] = useState<AdminEvent[]>([]); const [assets, setAssets] = useState<Asset[]>([]);
  const [editingId, setEditingId] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [contentGame, setContentGame] = useState(""); const [options, setOptions] = useState<ContentOption[]>([]);
  const [counts, setCounts] = useState({ available: 0, reserved: 0, archived: 0 }); const [search, setSearch] = useState(""); const [difficulty, setDifficulty] = useState(""); const [category, setCategory] = useState("");

  const loadEvents = () => fetch("/api/admin/events", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(data => setEvents(data.events ?? [])).catch(() => setMessage("Não foi possível carregar os eventos."));
  useEffect(() => { void loadEvents(); fetch("/api/admin/assets?status=ACTIVE", { cache: "no-store" }).then(response => response.ok ? response.json() : { assets: [] }).then(data => setAssets(data.assets ?? [])); }, []);
  useEffect(() => { if (!contentGame && draft.selectedGames.length) setContentGame(draft.selectedGames[0]); }, [contentGame, draft.selectedGames]);
  useEffect(() => {
    if (!contentGame) { setOptions([]); return; }
    const query = new URLSearchParams({ gameType: contentGame }); if (search) query.set("search", search); if (difficulty) query.set("difficulty", difficulty);
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetch(`/api/admin/events/suggest-content?${query}`, { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject()).then(data => { setOptions(data.options ?? []); setCounts(data.counts ?? { available: 0, reserved: 0, archived: 0 }); })
      .catch(error => { if (error?.name !== "AbortError") setMessage("Não foi possível consultar o catálogo elegível."); }), 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [contentGame, search, difficulty]);
  const categories = [...new Set(options.map(item => item.category).filter(Boolean))].sort((left, right) => left.localeCompare(right, "pt-BR"));
  const visibleOptions = category ? options.filter(item => item.category === category) : options;

  const errorFor = (target: number) => {
    if (target === 0 && draft.title.trim().length < 3) return "Informe um título com pelo menos 3 caracteres.";
    if (target === 1 && !draft.selectedGames.length) return "Selecione ao menos um jogo.";
    if (target === 2) for (const id of draft.selectedGames) if ((draft.contents[id]?.length ?? 0) !== game(id).required) return `${game(id).name} precisa de ${game(id).required} conteúdo(s).`;
    if (target === 3 && (draft.minimumParticipations < 1 || draft.minimumParticipations > draft.selectedGames.length)) return "O mínimo de jogos deve respeitar a quantidade selecionada.";
    if (target === 7 && (!draft.startsAt || !draft.endsAt || new Date(draft.endsAt) <= new Date(draft.startsAt))) return "A data final deve ser posterior à inicial.";
    return "";
  };
  const next = () => { const error = errorFor(step); if (error) return setMessage(error); setMessage(""); setStep(value => Math.min(STEPS.length - 1, value + 1)); };
  const toggleGame = (id: string) => setDraft(value => value.selectedGames.includes(id)
    ? { ...value, selectedGames: value.selectedGames.filter(item => item !== id), contents: Object.fromEntries(Object.entries(value.contents).filter(([key]) => key !== id)) }
    : { ...value, selectedGames: [...value.selectedGames, id] });
  const toggleContent = (item: ContentOption) => setDraft(value => { const current = value.contents[contentGame] ?? []; const exists = current.some(entry => entry.contentId === item.contentId);
    const nextItems = exists ? current.filter(entry => entry.contentId !== item.contentId) : current.length < game(contentGame).required ? [...current, item] : current;
    return { ...value, contents: { ...value.contents, [contentGame]: nextItems } }; });

  const payload = () => ({ title: draft.title, description: draft.description, coverAssetId: draft.coverAssetId || null, coverUrl: null,
    startsAt: new Date(draft.startsAt).getTime(), endsAt: new Date(draft.endsAt).getTime(), timeZone: draft.timeZone,
    completionRule: draft.completionRule, minimumParticipations: draft.completionRule === "ALL" ? draft.selectedGames.length : draft.minimumParticipations,
    ...draft.rewards, games: draft.selectedGames.map(gameType => ({ gameType, contentItems: (draft.contents[gameType] ?? []).map(({ contentId, contentVersion }) => ({ contentId, contentVersion })) })) });

  async function save(schedule: boolean) {
    for (let index = 0; index < STEPS.length; index++) { const error = errorFor(index); if (error) { setStep(index); setMessage(error); return; } }
    setBusy(true); setMessage("Validando e salvando o evento…");
    try {
      const response = await fetch(editingId ? `/api/admin/events/${encodeURIComponent(editingId)}` : "/api/admin/events", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "event_save_failed"); const id = editingId || data.event.id;
      if (schedule) { const validation = await fetch(`/api/admin/events/${encodeURIComponent(id)}/validate`, { method: "POST" }); if (!validation.ok) throw new Error("Revise os conteúdos: um item ficou indisponível ou reservado por outro evento.");
        const scheduled = await fetch(`/api/admin/events/${encodeURIComponent(id)}/schedule`, { method: "POST" }); if (!scheduled.ok) throw new Error("Não foi possível reservar os conteúdos. Revise conflitos e tente novamente."); }
      setMessage(schedule ? "Evento validado e agendado." : "Evento salvo como rascunho."); setDraft(initialDraft()); setEditingId(""); setStep(0); await loadEvents();
    } catch (error) { setMessage(error instanceof Error && !error.message.endsWith("_failed") ? error.message : "Não foi possível salvar o evento."); } finally { setBusy(false); }
  }

  async function edit(id: string) { const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok || !data.event) return setMessage("Não foi possível abrir o rascunho."); const item = data.event as AdminEvent;
    setDraft({ title: item.title, description: item.description, selectedGames: item.games.map(entry => entry.gameType), contents: Object.fromEntries(item.games.map(entry => [entry.gameType, entry.contents.map(content => ({ contentId: content.contentId, contentVersion: content.contentVersion, title: content.title }))])),
      completionRule: item.completionRule === "MINIMUM" ? "MINIMUM" : "ALL", minimumParticipations: item.minimumParticipations, rewards: item.rewards, coverAssetId: item.coverAssetId ?? "", startsAt: localDate(item.startsAt), endsAt: localDate(item.endsAt), timeZone: item.timeZone });
    setEditingId(id); setStep(0); setMessage("Rascunho carregado para edição."); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function action(id: string, name: "validate" | "schedule" | "cancel") { const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}/${name}`, { method: "POST" }); setMessage(response.ok ? (name === "validate" ? "Evento válido." : name === "schedule" ? "Evento agendado." : "Evento cancelado.") : "A operação foi recusada pelas validações do Evento."); await loadEvents(); }

  return <>
    <section className="event-wizard admin-panel" aria-labelledby="event-editor-title">
      <header><div><p className="eyebrow">{editingId ? "EDITAR RASCUNHO" : "NOVO EVENTO"}</p><h2 id="event-editor-title">{STEPS[step]}</h2></div><div><a className="event-calendar-link" href="/admin/calendario">Ver calendário</a><strong>Etapa {step + 1} de {STEPS.length}</strong></div></header>
      <nav className="event-wizard-steps" aria-label="Etapas do editor">{STEPS.map((label, index) => <button type="button" key={label} className={index === step ? "active" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined} onClick={() => index <= step && setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <div className="event-wizard-body">
        {step === 0 && <section className="event-fields"><label>Título<input value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} minLength={3} maxLength={120} required /></label><label>Descrição<textarea value={draft.description} onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} maxLength={1000} /></label><p className="field-note">O evento será criado como rascunho. Identificadores técnicos são gerados pela plataforma.</p></section>}
        {step === 1 && <section><p>Selecione os jogos que farão parte do Evento.</p><div className="event-game-picker">{GAMES.map(item => <label className={draft.selectedGames.includes(item.id) ? "selected" : ""} key={item.id}><input type="checkbox" checked={draft.selectedGames.includes(item.id)} onChange={() => toggleGame(item.id)} /><span>{item.icon}</span><strong>{item.name}</strong><small>{item.required} conteúdo(s) por partida</small></label>)}</div></section>}
        {step === 2 && <section className="event-content-step"><div className="event-content-toolbar"><label>Jogo<select value={contentGame} onChange={event => { setContentGame(event.target.value); setCategory(""); }}>{draft.selectedGames.map(id => <option key={id} value={id}>{game(id).name}</option>)}</select></label><label>Buscar<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Título, categoria, tema…" /></label><label>Categoria<select value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label>Dificuldade<select value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="">Todas</option><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></label></div>
          {contentGame && <div className="event-catalog-summary"><strong>{draft.contents[contentGame]?.length ?? 0} de {game(contentGame).required} selecionado(s)</strong><span>{counts.available} disponíveis</span><span>{counts.reserved} reservados</span></div>}
          {contentGame && counts.available > 0 && ((draft.contents[contentGame]?.length ?? 0) / counts.available >= .25) && <p className="event-warning" role="note">Este Evento reservará {draft.contents[contentGame]?.length ?? 0} de {counts.available} conteúdos disponíveis de {game(contentGame).name}.</p>}
          <div className="event-content-list">{visibleOptions.map(item => { const selected = draft.contents[contentGame]?.some(entry => entry.contentId === item.contentId); return <label className={selected ? "selected" : ""} key={item.contentId}><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleContent(item)} /><span><strong>{item.title}</strong><small>{item.category} · {item.difficulty}{item.biblicalReference ? ` · ${item.biblicalReference}` : ""}</small></span></label>; })}</div>
          {visibleOptions.length === 0 && <p className="event-empty">Nenhum conteúdo elegível corresponde aos filtros. Reservados e arquivados não podem ser selecionados.</p>}</section>}
        {step === 3 && <section className="event-fields"><label>Regra de conclusão<select value={draft.completionRule} onChange={event => setDraft(value => ({ ...value, completionRule: event.target.value as Draft["completionRule"] }))}><option value="ALL">Concluir todos os jogos</option><option value="MINIMUM">Concluir uma quantidade mínima</option></select></label>{draft.completionRule === "MINIMUM" && <label>Mínimo de jogos<input type="number" min="1" max={draft.selectedGames.length} value={draft.minimumParticipations} onChange={event => setDraft(value => ({ ...value, minimumParticipations: Number(event.target.value) }))} /></label>}<p className="field-note">As regras avançadas permanecem sob autoridade do backend e não são expostas como JSON.</p></section>}
        {step === 4 && <section className="event-fields event-reward-fields">{([['participationXp','XP por participação',100],['victoryCoins','Moedas por vitória',20],['completionBonusXp','Bônus de conclusão (XP)',250],['perfectBonusCoins','Bônus perfeito (moedas)',50]] as const).map(([key,label,max]) => <label key={key}>{label}<input type="number" min="0" max={max} value={draft.rewards[key]} onChange={event => setDraft(value => ({ ...value, rewards: { ...value.rewards, [key]: Number(event.target.value) } }))} /><small>Limite técnico atual: {max}</small></label>)}<p className="event-warning">Recompensas elevadas afetam a economia. Os limites técnicos são aplicados pelo servidor; a política editorial ainda requer decisão humana.</p></section>}
        {step === 5 && <section className="event-fields"><label>Capa do Evento<select value={draft.coverAssetId} onChange={event => setDraft(value => ({ ...value, coverAssetId: event.target.value }))}><option value="">Sem capa</option>{assets.filter(asset => asset.status === "ACTIVE").map(asset => <option key={asset.id} value={asset.id}>{asset.title} ({asset.type})</option>)}</select></label>{draft.coverAssetId && (() => { const asset = assets.find(item => item.id === draft.coverAssetId); return asset ? <figure className="event-asset-preview"><Image unoptimized src={asset.source_url} alt={asset.alt_text} width={720} height={360} /><figcaption>{asset.title}</figcaption></figure> : null; })()}<p className="field-note">Somente assets ativos da organização podem ser usados. URLs externas arbitrárias não são aceitas pelo editor.</p></section>}
        {step === 6 && <Review draft={draft} go={setStep} />}
        {step === 7 && <section className="event-fields"><div className="event-date-grid"><label>Início<input type="datetime-local" value={draft.startsAt} onChange={event => setDraft(value => ({ ...value, startsAt: event.target.value }))} /></label><label>Término<input type="datetime-local" value={draft.endsAt} onChange={event => setDraft(value => ({ ...value, endsAt: event.target.value }))} /></label></div><label>Fuso horário<input value={draft.timeZone} onChange={event => setDraft(value => ({ ...value, timeZone: event.target.value }))} /></label><p className="field-note">O agendamento revalida conteúdos e reservas no servidor. Conflitos concorrentes nunca são sobrescritos.</p><div className="event-final-actions"><button type="button" disabled={busy} onClick={() => void save(false)}>Salvar rascunho</button><button type="button" className="primary" disabled={busy} onClick={() => void save(true)}>Validar e agendar</button></div></section>}
      </div>
      <footer><button type="button" disabled={step === 0 || busy} onClick={() => setStep(value => value - 1)}>Voltar</button>{step < STEPS.length - 1 && <button type="button" className="primary" disabled={busy} onClick={next}>Próximo</button>}</footer>
      {message && <p className="event-editor-message" role="status">{message}</p>}
    </section>
    <section className="admin-panel event-admin-list"><header><div><p className="eyebrow">EVENTOS EXISTENTES</p><h2>Rascunhos e agenda</h2></div><span>{events.length}</span></header>{events.map(item => <article key={item.id}><div><strong>{item.title}</strong><small>{item.status} · {new Date(item.startsAt).toLocaleString("pt-BR")}</small></div>{item.status === "DRAFT" && <button onClick={() => void edit(item.id)}>Editar</button>}<button onClick={() => void action(item.id, "validate")}>Validar</button>{item.status === "DRAFT" && <button onClick={() => void action(item.id, "schedule")}>Agendar</button>}{["SCHEDULED","ACTIVE"].includes(item.status) && <button className="danger" onClick={() => void action(item.id, "cancel")}>Cancelar</button>}</article>)}{events.length === 0 && <p className="event-empty">Nenhum evento criado.</p>}</section>
  </>;
}

function Review({ draft, go }: { draft: Draft; go: (step: number) => void }) {
  const rows = [
    ["Informações", `${draft.title || "Sem título"} · ${draft.description || "Sem descrição"}`, 0],
    ["Jogos", draft.selectedGames.map(id => game(id).name).join(", ") || "Nenhum", 1],
    ["Conteúdos", `${Object.values(draft.contents).reduce((sum, items) => sum + items.length, 0)} selecionado(s)`, 2],
    ["Regras", draft.completionRule === "ALL" ? "Todos os jogos" : `Mínimo de ${draft.minimumParticipations}`, 3],
    ["Recompensas", `${draft.rewards.participationXp + draft.rewards.completionBonusXp} XP configurável · ${draft.rewards.victoryCoins + draft.rewards.perfectBonusCoins} moedas configuráveis`, 4],
    ["Aparência", draft.coverAssetId ? "Capa do Asset Registry selecionada" : "Sem capa", 5],
  ] as const;
  return <section className="event-review"><p>Confira o contrato que será enviado ao backend.</p>{rows.map(([title,value,index]) => <article key={title}><div><strong>{title}</strong><span>{value}</span></div><button type="button" onClick={() => go(index)}>Editar</button></article>)}</section>;
}
