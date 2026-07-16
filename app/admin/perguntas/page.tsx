"use client";
import { useCallback, useEffect, useState } from "react";
const blank = {
  reference: "",
  book: "",
  theme: "",
  category: "",
  difficulty: "medium",
  prompt: "",
  commentary: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  status: "active",
};
const label = (v: string) =>
  v === "easy" ? "Fácil" : v === "hard" ? "Difícil" : "Média";
export default function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]),
    [facets, setFacets] = useState<any[]>([]),
    [editing, setEditing] = useState<any>(null),
    [filters, setFilters] = useState<any>({
      q: "",
      theme: "",
      book: "",
      category: "",
      difficulty: "",
    }),
    [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [total, setTotal] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<string[]>([]),
    [batch, setBatch] = useState({
      action: "category",
      value: "",
      password: "",
    }),
    [preview, setPreview] = useState<any>(null),
    [lastOp, setLastOp] = useState("");
  const options = (f: string) =>
    [...new Set(facets.map((x) => x[f]).filter(Boolean))].sort() as string[];
  const load = useCallback(async () => {
    setLoading(true);
    setSelected([]);
    const query = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        page: String(page),
      } as any),
      r = await fetch(`/api/admin/questions?${query}`);
    if ([401, 403].includes(r.status)) {
      location.href = "/";
      return;
    }
    const d = await r.json();
    setQuestions(d.questions || []);
    setFacets(d.facets || []);
    setTotalPages(d.totalPages || 1);
    setTotal(d.total || 0);
    setLoading(false);
  }, [filters, page]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  function filter(p: any) {
    setPage(1);
    setFilters((c: any) => ({ ...c, ...p }));
  }
  function toggle(id: string) {
    setSelected((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
    );
  }
  async function open(id: string) {
    const r = await fetch(`/api/admin/questions/${id}`),
      d = await r.json();
    setEditing({
      ...d.question,
      choices: d.choices.map((x: any) => x.text),
      correctIndex: Math.max(
        0,
        d.choices.findIndex((x: any) => x.correct),
      ),
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const creating = !editing.id,
      r = await fetch(
        creating
          ? "/api/admin/questions"
          : `/api/admin/questions/${editing.id}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(editing),
        },
      ),
      d = await r.json();
    setBusy(false);
    if (r.ok) {
      setEditing(null);
      setMessage(creating ? "Pergunta adicionada." : "Pergunta atualizada.");
      load();
    } else
      setMessage(
        d.error === "duplicate_question"
          ? `Pergunta duplicada: “${d.duplicate.prompt}”.`
          : "Confira os campos.",
      );
  }
  async function archive(item: any) {
    if (!confirm(`Arquivar “${item.prompt}”?`)) return;
    if (
      (await fetch(`/api/admin/questions/${item.id}`, { method: "DELETE" })).ok
    ) {
      setMessage("Pergunta arquivada.");
      load();
    }
  }
  async function previewBatch() {
    const r = await fetch("/api/admin/questions/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...batch, ids: selected, preview: true }),
      }),
      d = await r.json();
    if (r.ok) setPreview(d.preview);
    else
      setMessage(
        d.error === "invalid_password"
          ? "Senha administrativa incorreta."
          : "Confira a operação.",
      );
  }
  async function applyBatch() {
    const r = await fetch("/api/admin/questions/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...batch, ids: selected }),
      }),
      d = await r.json();
    if (r.ok) {
      setLastOp(d.operationId);
      setPreview(null);
      setMessage(`${d.count} pergunta(s) alterada(s).`);
      load();
    } else setMessage("Não foi possível aplicar.");
  }
  async function undo() {
    const r = await fetch("/api/admin/questions/batch", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operationId: lastOp }),
    });
    if (r.ok) {
      setLastOp("");
      setMessage("Operação desfeita.");
      load();
    }
  }
  const patch = (v: any) => setEditing((c: any) => ({ ...c, ...v }));
  return (
    <main className="admin-shell">
      <section className="admin-title">
        <p className="eyebrow">ACERVO DE CONTEÚDO</p>
        <h1>
          Banco de <em>perguntas</em>
        </h1>
        <p>{total} pergunta(s) disponíveis para reutilização.</p>
      </section>
      <section className="bank-toolbar admin-panel">
        <input
          placeholder="Pesquisar enunciado ou referência"
          value={filters.q}
          onChange={(e) => filter({ q: e.target.value })}
        />
        {[
          ["theme", "Todos os temas"],
          ["book", "Todos os livros"],
          ["category", "Todas as categorias"],
        ].map(([f, l]) => (
          <select
            key={f}
            value={filters[f]}
            onChange={(e) => filter({ [f]: e.target.value })}
          >
            <option value="">{l}</option>
            {options(f).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
        <select
          value={filters.difficulty}
          onChange={(e) => filter({ difficulty: e.target.value })}
        >
          <option value="">Dificuldade</option>
          <option value="easy">Fácil</option>
          <option value="medium">Média</option>
          <option value="hard">Difícil</option>
        </select>
        <a className="similar-link" href="/admin/perguntas/duplicadas">
          SIMILARES
        </a>
        <button
          onClick={() => setEditing({ ...blank, choices: [...blank.choices] })}
        >
          + NOVA
        </button>
      </section>
      {message && (
        <p className="auth-message">
          {message}
          {lastOp && (
            <button className="inline-undo" onClick={undo}>
              DESFAZER
            </button>
          )}
        </p>
      )}
      {questions.length > 0 && (
        <aside className="batch-toolbar">
          <label>
            <input
              type="checkbox"
              checked={selected.length === questions.length}
              onChange={(e) =>
                setSelected(e.target.checked ? questions.map((q) => q.id) : [])
              }
            />{" "}
            Selecionar página
          </label>
          <strong>{selected.length} selecionada(s)</strong>
          {selected.length > 0 && (
            <>
              <select
                value={batch.action}
                onChange={(e) =>
                  setBatch({ ...batch, action: e.target.value, value: "" })
                }
              >
                <option value="category">Alterar categoria</option>
                <option value="theme">Alterar tema</option>
                <option value="difficulty">Alterar dificuldade</option>
                <option value="status">Alterar situação</option>
                <option value="archive">Arquivar</option>
              </select>
              {batch.action === "difficulty" ? (
                <select
                  value={batch.value}
                  onChange={(e) =>
                    setBatch({ ...batch, value: e.target.value })
                  }
                >
                  <option value="">Escolha</option>
                  <option value="easy">Fácil</option>
                  <option value="medium">Média</option>
                  <option value="hard">Difícil</option>
                </select>
              ) : batch.action === "status" ? (
                <select
                  value={batch.value}
                  onChange={(e) =>
                    setBatch({ ...batch, value: e.target.value })
                  }
                >
                  <option value="">Escolha</option>
                  <option value="active">Ativa</option>
                  <option value="draft">Rascunho</option>
                </select>
              ) : batch.action !== "archive" ? (
                <input
                  value={batch.value}
                  onChange={(e) =>
                    setBatch({ ...batch, value: e.target.value })
                  }
                  placeholder="Novo valor"
                />
              ) : (
                <input
                  type="password"
                  value={batch.password}
                  onChange={(e) =>
                    setBatch({ ...batch, password: e.target.value })
                  }
                  placeholder="Senha administrativa"
                />
              )}
              <button onClick={previewBatch}>REVISAR</button>
            </>
          )}
        </aside>
      )}
      {loading ? (
        <section className="admin-panel bank-empty">Carregando...</section>
      ) : (
        <section className="bank-grid">
          {questions.map((item) => (
            <article
              className={`admin-panel bank-card ${selected.includes(item.id) ? "selected" : ""}`}
              key={item.id}
            >
              <header>
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  aria-label="Selecionar"
                />
                <small>{item.reference || "Sem referência"}</small>
                <small>{item.times_used} uso(s)</small>
              </header>
              <h2>{item.prompt}</h2>
              <p>{item.commentary || "Sem comentário."}</p>
              <div className="bank-tags">
                <span>{item.theme}</span>
                {item.book && <span>{item.book}</span>}
                {item.category && <span>{item.category}</span>}
                <span>{label(item.difficulty)}</span>
              </div>
              <footer>
                <button onClick={() => open(item.id)}>Editar</button>
                <button className="danger" onClick={() => archive(item)}>
                  Arquivar
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}
      <nav className="bank-pagination">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          ← Anterior
        </button>
        <span>
          Página <b>{page}</b> de <b>{totalPages}</b>
        </span>
        <button
          disabled={page >= totalPages || loading}
          onClick={() => setPage(page + 1)}
        >
          Próxima →
        </button>
      </nav>
      {editing && (
        <div className="bank-editor-layer">
          <form className="bank-editor" onSubmit={save}>
            <h2>{editing.id ? "Editar pergunta" : "Nova pergunta"}</h2>
            <div className="bank-editor-grid">
              <label>
                Referência
                <input
                  value={editing.reference || ""}
                  onChange={(e) => patch({ reference: e.target.value })}
                />
              </label>
              <label>
                Livro
                <input
                  value={editing.book || ""}
                  onChange={(e) => patch({ book: e.target.value })}
                />
              </label>
              <label>
                Tema
                <input
                  required
                  value={editing.theme || ""}
                  onChange={(e) => patch({ theme: e.target.value })}
                />
              </label>
              <label>
                Categoria
                <input
                  value={editing.category || ""}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </label>
              <label>
                Dificuldade
                <select
                  value={editing.difficulty}
                  onChange={(e) => patch({ difficulty: e.target.value })}
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Média</option>
                  <option value="hard">Difícil</option>
                </select>
              </label>
              <label>
                Situação
                <select
                  value={editing.status}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  <option value="active">Ativa</option>
                  <option value="draft">Rascunho</option>
                </select>
              </label>
              <label className="wide">
                Enunciado
                <textarea
                  required
                  value={editing.prompt}
                  onChange={(e) => patch({ prompt: e.target.value })}
                />
              </label>
            </div>
            <div className="bank-choices">
              {editing.choices.map((choice: string, i: number) => (
                <label className="bank-choice" key={i}>
                  <input
                    type="radio"
                    checked={editing.correctIndex === i}
                    onChange={() => patch({ correctIndex: i })}
                  />
                  <input
                    required
                    value={choice}
                    onChange={(e) => {
                      const choices = [...editing.choices];
                      choices[i] = e.target.value;
                      patch({ choices });
                    }}
                  />
                </label>
              ))}
            </div>
            <label>
              Comentário
              <textarea
                value={editing.commentary || ""}
                onChange={(e) => patch({ commentary: e.target.value })}
              />
            </label>
            <footer>
              <button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="save" disabled={busy}>
                SALVAR
              </button>
            </footer>
          </form>
        </div>
      )}
      {preview && (
        <div className="modal-layer">
          <section className="admin-panel batch-preview">
            <h2>Confirmar alteração em lote</h2>
            <p>
              <b>{preview.count}</b> pergunta(s) serão alteradas.
            </p>
            <ul>
              {preview.questions.slice(0, 8).map((q: any) => (
                <li key={q.id}>{q.prompt}</li>
              ))}
            </ul>
            {preview.count > 8 && <p>…e mais {preview.count - 8}.</p>}
            <footer>
              <button onClick={() => setPreview(null)}>Cancelar</button>
              <button className="primary" onClick={applyBatch}>
                CONFIRMAR
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
