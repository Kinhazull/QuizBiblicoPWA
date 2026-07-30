"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gameModules } from "../../games/sdk/gameModules";

type Capability = {
  gameType: string;
  difficulties: string[];
  supportsTheme: boolean;
  supportsBook: boolean;
  supportsTestament: boolean;
  counts: number[];
};
type CatalogOptions = { themes: string[]; books: string[]; difficulties: string[] };

const difficultyLabels: Record<string, string> = {
  VERY_EASY: "Muito fácil",
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
  SPECIAL: "Especial",
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const data = await response.json().catch(() => null) as T | null;
  if (!response.ok || !data) {
    const code = (data as { error?: string } | null)?.error;
    throw new Error(code || (response.status === 401 ? "unauthorized" : "request_failed"));
  }
  return data;
}

export default function FreePlayPage() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [gameType, setGameType] = useState("");
  const [options, setOptions] = useState<CatalogOptions>({ themes: [], books: [], difficulties: [] });
  const [difficulty, setDifficulty] = useState("");
  const [theme, setTheme] = useState("");
  const [book, setBook] = useState("");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef<string | null>(null);

  const capability = useMemo(
    () => capabilities.find(item => item.gameType === gameType) ?? null,
    [capabilities, gameType],
  );
  const availableGames = useMemo(
    () => gameModules.filter(game => capabilities.some(item => item.gameType === game.id)),
    [capabilities],
  );

  useEffect(() => {
    const controller = new AbortController();
    getJson<{ games: Capability[] }>("/api/platform/free-play/capabilities", { signal: controller.signal })
      .then(data => {
        setCapabilities(data.games);
        setGameType(data.games[0]?.gameType ?? "");
      })
      .catch(cause => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error && cause.message === "unauthorized"
          ? "Entre na sua conta para acessar o Modo Livre."
          : "Não foi possível carregar os jogos disponíveis.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!gameType) return;
    const controller = new AbortController();
    setOptions({ themes: [], books: [], difficulties: [] });
    setDifficulty("");
    setTheme("");
    setBook("");
    setCount(capability?.counts[0] ?? 1);
    getJson<{ options: CatalogOptions }>(
      `/api/platform/free-play/catalog-options?gameType=${encodeURIComponent(gameType)}`,
      { signal: controller.signal },
    ).then(data => setOptions(data.options)).catch(() => {
      if (!controller.signal.aborted) setError("As opções deste jogo estão temporariamente indisponíveis.");
    });
    return () => controller.abort();
  }, [gameType, capability]);

  async function generate() {
    if (!gameType || generating) return;
    setGenerating(true);
    setError("");
    requestKey.current ??= crypto.randomUUID();
    try {
      const result = await getJson<{ game: { playHref: string } }>("/api/platform/free-play/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gameType,
          idempotencyKey: requestKey.current,
          filters: {
            count,
            difficulty: difficulty || undefined,
            theme: theme || undefined,
            book: book || undefined,
          },
        }),
      });
      window.location.assign(result.game.playHref);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setError(code === "insufficient_eligible_content"
        ? "Ainda não há conteúdo suficiente para essa combinação."
        : code === "unsupported_filter" || code === "invalid_quantity"
          ? "Revise os filtros escolhidos e tente novamente."
          : "Não foi possível gerar a partida. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="free-play-page">
      <div className="free-play-shell">
        <header className="free-play-heading">
          <a href="/jogos">← Jogos</a>
          <p>Jogue no seu ritmo</p>
          <h1>Modo <em>Livre</em></h1>
          <span>Escolha um jogo e gere uma partida exclusiva com conteúdo publicado pela sua organização.</span>
        </header>

        {loading ? <div className="free-play-state" role="status">Carregando jogos…</div> : null}
        {!loading && !availableGames.length && !error
          ? <div className="free-play-state">Nenhum jogo está disponível no momento.</div>
          : null}

        {!loading && availableGames.length ? (
          <section className="free-play-config" aria-labelledby="free-play-config-title">
            <h2 id="free-play-config-title">Configure sua partida</h2>
            <fieldset>
              <legend>Escolha o jogo</legend>
              <div className="free-play-games">
                {availableGames.map(game => (
                  <button
                    aria-pressed={gameType === game.id}
                    className={gameType === game.id ? "selected" : ""}
                    key={game.id}
                    onClick={() => {
                      requestKey.current = null;
                      setGameType(game.id);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true">{game.image}</span>
                    {game.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="free-play-filters">
              {capability && capability.difficulties.length > 0 ? (
                <label>Dificuldade
                  <select value={difficulty} onChange={event => { requestKey.current = null; setDifficulty(event.target.value); }}>
                    <option value="">Todas</option>
                    {capability.difficulties
                      .filter(value => !options.difficulties.length || options.difficulties.includes(value))
                      .map(value => <option key={value} value={value}>{difficultyLabels[value] ?? value}</option>)}
                  </select>
                </label>
              ) : null}
              {capability?.supportsTheme && options.themes.length ? (
                <label>Tema
                  <select value={theme} onChange={event => { requestKey.current = null; setTheme(event.target.value); }}>
                    <option value="">Todos</option>
                    {options.themes.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              ) : null}
              {capability?.supportsBook && options.books.length ? (
                <label>Livro
                  <select value={book} onChange={event => { requestKey.current = null; setBook(event.target.value); }}>
                    <option value="">Todos</option>
                    {options.books.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              ) : null}
              {capability && capability.counts.length > 1 ? (
                <label>Quantidade
                  <select value={count} onChange={event => { requestKey.current = null; setCount(Number(event.target.value)); }}>
                    {capability.counts.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              ) : null}
            </div>

            {error ? <p className="free-play-error" role="alert">{error}</p> : null}
            <button className="free-play-generate" disabled={generating} onClick={generate} type="button">
              {generating ? "Gerando partida…" : "Gerar nova partida"}
            </button>
          </section>
        ) : null}
        {!loading && error && !availableGames.length ? <p className="free-play-error" role="alert">{error}</p> : null}
      </div>
    </main>
  );
}
