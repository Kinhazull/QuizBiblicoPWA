"use client";
import { useCallback, useEffect, useState } from "react";
export default function ArchivedQuestions() {
  const [items, setItems] = useState<any[]>([]),
    [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [total, setTotal] = useState(0),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams({
        archived: "1",
        page: String(page),
        limit: "50",
        q: query,
      }),
      response = await fetch(`/api/admin/questions?${params}`, {
        cache: "no-store",
      });
    if (!response.ok) {
      location.href = "/admin/perguntas";
      return;
    }
    const data = await response.json();
    setItems(data.questions || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, query]);
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);
  async function restore(item: any) {
    if (!confirm(`Restaurar “${item.prompt}” como rascunho?`)) return;
    const response = await fetch(`/api/admin/questions/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    setMessage(
      response.ok
        ? "Pergunta restaurada como rascunho."
        : "Não foi possível restaurar.",
    );
    if (response.ok) load();
  }
  async function permanentlyDelete(item: any) {
    if (
      !confirm(
        `Excluir definitivamente “${item.prompt}”? Esta ação é irreversível e preservará apenas as cópias já publicadas em rodadas.`,
      )
    )
      return;
    const password = prompt("Confirme sua senha administrativa:");
    if (!password) return;
    const response = await fetch(
        `/api/admin/questions/${item.id}?permanent=1`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        },
      ),
      data = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? "Pergunta excluída definitivamente."
        : data.error === "invalid_password"
          ? "Senha administrativa incorreta."
          : data.error === "question_not_archived"
            ? "Somente perguntas arquivadas podem ser excluídas."
            : "Não foi possível excluir a pergunta.",
    );
    if (response.ok) load();
  }
  return (
    <main className="admin-shell">
      <section className="admin-title">
        <p className="eyebrow">HISTÓRICO DO ACERVO</p>
        <h1>
          Perguntas <em>arquivadas</em>
        </h1>
        <p>
          {total} pergunta(s) fora do acervo ativo. A exclusão definitiva é
          irreversível.
        </p>
      </section>
      <section className="bank-toolbar admin-panel">
        <input
          aria-label="Pesquisar perguntas arquivadas"
          placeholder="Pesquisar enunciado ou referência"
          value={query}
          onChange={(event) => {
            setPage(1);
            setQuery(event.target.value);
          }}
        />
        <a className="similar-link" href="/admin/perguntas">
          Voltar ao acervo
        </a>
      </section>
      {message && (
        <p className="auth-message" role="status">
          {message}
        </p>
      )}
      <section className="archive-grid">
        {items.map((item) => (
          <article className="admin-panel archive-card" key={item.id}>
            <small>
              {item.reference || item.book || "Sem referência"} · {item.theme}
            </small>
            <h2>{item.prompt}</h2>
            <p>{item.commentary || "Sem comentário."}</p>
            <footer>
              <button onClick={() => restore(item)}>
                Restaurar como rascunho
              </button>
              <button
                className="danger-button"
                onClick={() => permanentlyDelete(item)}
              >
                Excluir definitivamente
              </button>
            </footer>
          </article>
        ))}
        {!items.length && (
          <div className="admin-panel bank-empty">
            Nenhuma pergunta arquivada encontrada.
          </div>
        )}
      </section>
      <nav className="bank-pagination" aria-label="Paginação">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ← Anterior
        </button>
        <span>
          Página <b>{page}</b> de <b>{totalPages}</b>
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Próxima →
        </button>
      </nav>
    </main>
  );
}
