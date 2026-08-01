"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BrandIcon } from "../../navigation";

type GameType =
  | "quiz-biblico" | "wordle-biblico" | "associacao-de-temas"
  | "linha-do-tempo-biblica" | "memoria-biblica" | "quem-sou-eu" | "jogo-tres-pistas";
type ContentStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
type Difficulty = "VERY_EASY" | "EASY" | "MEDIUM" | "HARD" | "SPECIAL";
type DashboardData = {
  total: number;
  archived: number;
  needsReview: number;
  byStatus: Record<ContentStatus, number>;
  byGame: { gameType: GameType; count: number; integrated: boolean }[];
};
type ContentItem = {
  id: string;
  source: "UNIVERSAL_CMS";
  gameType: GameType;
  title: string;
  biblicalReference: string | null;
  book: string | null;
  category: string;
  difficulty: Difficulty;
  status: ContentStatus;
  version: number;
  updatedAt: number;
  timesUsed: number;
  tags: readonly { id: string; label: string }[];
  indicators: readonly string[];
  links: { edit: string; review: string | null; history: string };
};
type ContentResponse = {
  items: ContentItem[];
  facets: { categories: string[]; books: string[]; tags: string[]; difficulties: Difficulty[]; statuses: ContentStatus[]; sources: string[] };
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
  totals: DashboardData;
};

const gameLabels: Record<GameType, string> = {
  "quiz-biblico": "Quiz Bíblico",
  "wordle-biblico": "Wordle Bíblico",
  "associacao-de-temas": "Associação de Temas",
  "linha-do-tempo-biblica": "Linha do Tempo",
  "memoria-biblica": "Memória Bíblica",
  "quem-sou-eu": "Quem Sou Eu?",
  "jogo-tres-pistas": "3 Pistas",
};
const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};
const difficultyLabels: Record<Difficulty, string> = {
  VERY_EASY: "Muito fácil", EASY: "Fácil", MEDIUM: "Média", HARD: "Difícil", SPECIAL: "Especial",
};
const number = new Intl.NumberFormat("pt-BR");
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const isDashboardData = (value: unknown): value is DashboardData => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<DashboardData>;
  return typeof data.total === "number"
    && typeof data.archived === "number"
    && typeof data.needsReview === "number"
    && Boolean(data.byStatus)
    && Array.isArray(data.byGame);
};
const isContentResponse = (value: unknown): value is ContentResponse => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ContentResponse>;
  return Array.isArray(data.items)
    && Boolean(data.facets)
    && Boolean(data.pagination)
    && isDashboardData(data.totals);
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`content-status ${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

export function ContentGameBadge({ gameType }: { gameType: GameType }) {
  return <span className="content-game"><BrandIcon name="gamepad" />{gameLabels[gameType]}</span>;
}

export function CmsLoadingState({ label = "Carregando conteúdo…" }: { label?: string }) {
  return <div className="cms-state loading" role="status" aria-live="polite"><span aria-hidden="true" />{label}</div>;
}

export function CmsErrorState({ retry, forbidden = false }: { retry: () => void; forbidden?: boolean }) {
  return <div className="cms-state error" role="alert"><BrandIcon name="health" /><div><strong>{forbidden ? "Acesso não autorizado." : "Não foi possível carregar o conteúdo."}</strong><p>{forbidden ? "Sua conta não possui permissão para consultar este acervo." : "Tente novamente. Se o problema continuar, abra o Diagnóstico."}</p></div>{!forbidden && <button type="button" onClick={retry}>Tentar novamente</button>}</div>;
}

export function CmsEmptyState() {
  return <div className="cms-state empty"><BrandIcon name="database" /><div><strong>Nenhum conteúdo encontrado</strong><p>Ajuste os filtros do Acervo Universal.</p></div></div>;
}

function useCmsRequest<T>(url: string, validate: (value: unknown) => value is T, reloadKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "request" | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        if (response.status === 401 || response.status === 403) throw new Error("forbidden");
        if (!response.ok) throw new Error("request_failed");
        return response.json() as Promise<unknown>;
      })
      .then(payload => {
        if (!validate(payload)) throw new Error("invalid_response");
        setData(payload);
      })
      .catch(reason => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setError(reason instanceof Error && reason.message === "forbidden" ? "forbidden" : "request");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, validate, reloadKey]);
  return { data, loading, error };
}

export function ContentDashboard() {
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useCmsRequest("/api/admin/content?view=dashboard", isDashboardData, reload);
  return <>
    {loading && !data && <CmsLoadingState label="Carregando indicadores editoriais…" />}
    {error && <CmsErrorState forbidden={error === "forbidden"} retry={() => setReload(value => value + 1)} />}
    {data && <>
      <section className="content-metrics" aria-label="Indicadores do conteúdo">
        <article><BrandIcon name="database" /><strong>{number.format(data.total)}</strong><span>Conteúdos persistidos</span></article>
        <article><BrandIcon name="review" /><strong>{number.format(data.needsReview)}</strong><span>Precisam de revisão</span></article>
        <article><BrandIcon name="file" /><strong>{number.format(data.archived)}</strong><span>Arquivados</span></article>
        <article><BrandIcon name="health" /><strong>{number.format(data.byStatus.PUBLISHED)}</strong><span>Publicados</span></article>
      </section>
      <section className="content-game-summary" aria-labelledby="game-summary-title">
        <header><div><p className="eyebrow">FONTES DE CONTEÚDO</p><h2 id="game-summary-title">Acervo por jogo</h2></div><a href="/admin/conteudo/acervo">Abrir Acervo</a></header>
        <div>
          {data.byGame.map(game => <article key={game.gameType} className={game.integrated ? "integrated" : "pending"}>
            <ContentGameBadge gameType={game.gameType} />
            <strong>{number.format(game.count)}</strong>
            <small>{game.integrated ? "Persistência integrada" : "Integração de conteúdo pendente"}</small>
          </article>)}
        </div>
      </section>
      <section className="content-status-summary admin-panel" aria-labelledby="status-summary-title">
        <header><div><p className="eyebrow">FLUXO EDITORIAL</p><h2 id="status-summary-title">Conteúdos por status</h2></div></header>
        <div>{Object.entries(data.byStatus).map(([status, count]) => <a href={`/admin/conteudo/acervo?status=${status}`} key={status}><ContentStatusBadge status={status as ContentStatus} /><strong>{number.format(count)}</strong></a>)}</div>
      </section>
    </>}
  </>;
}

const initialFilters = {
  q: "", game: "", status: "", difficulty: "", category: "", book: "",
  reference: "", tag: "", archived: false, pageSize: "20",
};

export function UniversalContentArchive() {
  const initialUrlFilters = () => {
    if (typeof window === "undefined") return initialFilters;
    const search = new URLSearchParams(window.location.search);
    const status = search.get("status");
    return {
      ...initialFilters,
      status: status && Object.hasOwn(statusLabels, status) ? status : "",
    };
  };
  const [draft, setDraft] = useState(initialUrlFilters);
  const [filters, setFilters] = useState(initialUrlFilters);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== false)),
    ...(filters.archived ? { archived: "1" } : {}),
    page: String(page),
    pageSize: filters.pageSize,
  }).toString();
  const { data, loading, error } = useCmsRequest(`/api/admin/content?${query}`, isContentResponse, reload);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  };
  const clear = () => {
    setDraft(initialFilters);
    setFilters(initialFilters);
    setPage(1);
  };
  return <>
    <form className="universal-content-filters admin-panel" onSubmit={submit} aria-label="Filtros do Acervo">
      <label className="wide">Busca textual<input value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} placeholder="Enunciado, referência ou tema" /></label>
      <label>Jogo<select value={draft.game} onChange={event => setDraft({ ...draft, game: event.target.value })}><option value="">Todos os jogos</option>{Object.entries(gameLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Todos ativos</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Dificuldade<select value={draft.difficulty} onChange={event => setDraft({ ...draft, difficulty: event.target.value })}><option value="">Todas</option>{Object.entries(difficultyLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Categoria<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Todas</option>{data?.facets.categories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Livro bíblico<select value={draft.book} onChange={event => setDraft({ ...draft, book: event.target.value })}><option value="">Todos</option>{data?.facets.books.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Referência<input value={draft.reference} onChange={event => setDraft({ ...draft, reference: event.target.value })} placeholder="Ex.: João 3" /></label>
      <label>Tag<select value={draft.tag} onChange={event => setDraft({ ...draft, tag: event.target.value })}><option value="">Todas</option>{data?.facets.tags.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Itens por página<select value={draft.pageSize} onChange={event => setDraft({ ...draft, pageSize: event.target.value })}><option>10</option><option>20</option><option>50</option></select></label>
      <label className="checkbox"><input type="checkbox" checked={draft.archived} onChange={event => setDraft({ ...draft, archived: event.target.checked, status: event.target.checked ? "ARCHIVED" : draft.status === "ARCHIVED" ? "" : draft.status })} />Somente arquivados</label>
      <div className="filter-actions"><button type="submit">Aplicar filtros</button><button type="button" onClick={clear}>Limpar</button></div>
    </form>

    <div className="content-results-heading" aria-live="polite"><strong>{number.format(data?.pagination.total || 0)} conteúdo(s)</strong>{loading && <span>Atualizando…</span>}</div>
    {loading && !data && <CmsLoadingState />}
    {error && <CmsErrorState forbidden={error === "forbidden"} retry={() => setReload(value => value + 1)} />}
    {!loading && data?.items.length === 0 && <CmsEmptyState />}
    {data && data.items.length > 0 && <section className="universal-content-list" aria-label="Conteúdos encontrados">
      {data.items.map(item => <article className="universal-content-card" key={`${item.source}:${item.id}`}>
        <header><ContentGameBadge gameType={item.gameType} /><ContentStatusBadge status={item.status} /></header>
        <h2>{item.title}</h2>
        <p className="content-indicator">CMS universal</p>
        <dl>
          <div><dt>Referência</dt><dd>{item.biblicalReference || "Não informada"}</dd></div>
          <div><dt>Categoria</dt><dd>{item.category}</dd></div>
          <div><dt>Dificuldade</dt><dd>{difficultyLabels[item.difficulty]}</dd></div>
          <div><dt>Versão</dt><dd>{item.version}</dd></div>
          <div><dt>Atualização</dt><dd>{item.updatedAt ? date.format(item.updatedAt) : "Não informada"}</dd></div>
          <div><dt>Utilizações</dt><dd>{number.format(item.timesUsed)}</dd></div>
        </dl>
        {item.tags.length > 0 && <div className="content-tags" aria-label="Tags">{item.tags.map(tag => <span key={tag.id}>{tag.label}</span>)}</div>}
        {item.indicators.map(indicator => <p className="content-indicator" key={indicator}><BrandIcon name="health" />{indicator}</p>)}
        <footer><a href={item.links.edit}>Abrir conteúdo</a>{item.links.review && <a href={item.links.review}>Revisão</a>}<a href={item.links.history}>Versões</a></footer>
      </article>)}
    </section>}
    {data && <nav className="content-pagination" aria-label="Paginação do Acervo">
      <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>← Anterior</button>
      <span>Página <strong>{data.pagination.page}</strong> de <strong>{data.pagination.totalPages}</strong></span>
      <button type="button" disabled={!data.pagination.hasMore || loading} onClick={() => setPage(value => value + 1)}>Próxima →</button>
    </nav>}
  </>;
}
