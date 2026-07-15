"use client";

import { useEffect, useState } from "react";
import { roundErrorMessage } from "../../round-errors";

const blankQuestion = () => ({ reference: "", prompt: "", choices: ["", "", "", ""], correctIndex: 0, commentary: "", bankQuestionId: "" });

export default function RoundsAdmin() {
  const [questions, setQuestions] = useState(() => Array.from({ length: 10 }, blankQuestion));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<any>(null);
  const [composer, setComposer] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => { fetch("/api/admin/seasons").then(async response => { if (response.ok) setSeasons((await response.json()).seasons || []); }); }, []);

  function updateQuestion(index: number, patch: any) {
    setQuestions(current => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  }

  async function openBank(index: number, patch: any = {}) {
    const state = { index, search: "", theme: "", book: "", difficulty: "", page: 1, ...(picker?.index === index ? picker : {}), ...patch };
    const params = new URLSearchParams({ q: state.search, theme: state.theme, book: state.book, difficulty: state.difficulty, page: String(state.page), selectable: "1" });
    const response = await fetch(`/api/admin/questions?${params}`); const data = await response.json();
    if (!response.ok) { setMessage("Não foi possível abrir o acervo. Verifique sua permissão e o Diagnóstico do sistema."); return; }
    setPicker({ ...state, items: data.questions || [], facets: data.facets || [], total: data.total || 0, totalPages: data.totalPages || 1 });
  }

  async function chooseFromBank(id: string) {
    if (!picker) return; const response = await fetch(`/api/admin/questions/${id}`); const data = await response.json();
    if (!response.ok || !data.question) { setMessage("Não foi possível carregar esta pergunta do acervo."); return; }
    updateQuestion(picker.index, { bankQuestionId: id, reference: data.question.reference || "", prompt: data.question.prompt, commentary: data.question.commentary || "", choices: data.choices.map((choice: any) => choice.text), correctIndex: Math.max(0, data.choices.findIndex((choice: any) => choice.correct)) });
    setPicker(null);
  }

  async function openComposer() {
    const response = await fetch("/api/admin/questions?selectable=1"); const data = await response.json();
    if (!response.ok) { setMessage("Não foi possível consultar o acervo aprovado."); return; }
    if (!data.total) { setMessage("Não há perguntas aprovadas disponíveis. Aprove a Base 100 na Revisão de Perguntas ou execute a regularização da base."); return; }
    setComposer({ theme: "", book: "", category: "", difficulty: "", facets: data.facets || [], busy: false });
  }

  async function composeAutomatically() {
    const empty = questions.map((question, index) => ({ question, index })).filter(item => !item.question.prompt.trim());
    if (!empty.length) { setMessage("As dez posições já estão preenchidas."); setComposer(null); return; }
    setComposer({ ...composer, busy: true }); const excludeIds = questions.map(question => question.bankQuestionId).filter(Boolean);
    const response = await fetch("/api/admin/questions/compose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme: composer.theme, book: composer.book, category: composer.category, difficulty: composer.difficulty, count: empty.length, excludeIds }) }); const data = await response.json();
    if (!response.ok) { setMessage("Não foi possível consultar o banco de perguntas."); setComposer({ ...composer, busy: false }); return; }
    setQuestions(current => { const next = [...current]; data.questions.forEach((question: any, position: number) => { next[empty[position].index] = question; }); return next; });
    setMessage(data.missing ? `${data.questions.length} pergunta(s) carregada(s). Ainda faltam ${data.missing} para completar os filtros escolhidos.` : `${data.questions.length} pergunta(s) carregada(s) automaticamente.`); setComposer(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const formElement=event.currentTarget;const data = Object.fromEntries(new FormData(formElement));
    if(data.roundType==="regular"&&!data.seasonId){setMessage("Selecione uma temporada para a rodada regular.");(formElement.elements.namedItem("seasonId") as HTMLElement)?.focus();setBusy(false);return}
    const opening=new Date(String(data.opensAt)).getTime(),closing=new Date(String(data.closesAt)).getTime();if(Number.isFinite(opening)&&Number.isFinite(closing)&&closing<=opening){setMessage("O encerramento deve acontecer depois da abertura.");(formElement.elements.namedItem("closesAt") as HTMLElement)?.focus();setBusy(false);return}
    const response = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: data.title, theme: data.theme, description: data.description, opensAt: data.opensAt, closesAt: data.closesAt, seasonId: data.seasonId, roundType: data.roundType, featured: data.featured === "on", secondsPerQuestion: data.secondsPerQuestion, officialAttemptLimit: data.officialAttemptLimit, advancedRules: advanced ? { allowPractice: data.allowPractice === "on", basePoints: data.basePoints, speedPointsPerSecond: data.speedPointsPerSecond, streakBonus: data.streakBonus, minimumCorrectPoints: data.minimumCorrectPoints } : null, questions }),
    });
    const result = await response.json();
    if (response.ok) {
      location.replace(`/admin/rodadas/detalhes?id=${result.roundId}`);
      return;
    }
    setMessage(roundErrorMessage(result));
    if(result.field)(formElement.elements.namedItem(result.field) as HTMLElement)?.focus();
    setBusy(false);
  }

  return <main className="admin-shell">
    <header className="admin-head"><div className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</div><a href="/admin">Acessos</a></header>
    <section className="admin-title"><p className="eyebrow">NOVA RODADA</p><h1>Prepare a próxima <em>jornada</em></h1><p>Ela permanecerá bloqueada até a data e o horário definidos.</p></section>
    <form className="round-form" onSubmit={submit}>
      <section className="admin-panel round-basics">
        <label>Título<input name="title" required placeholder="Ex.: Contem o que Deus fez" /></label>
        <label>Tema<input name="theme" required placeholder="Testemunhos e milagres" /></label>
        <label className="wide">Apresentação<textarea name="description" placeholder="Uma breve introdução para os participantes" /></label>
        <label>Liberação (horário de Brasília)<input name="opensAt" type="datetime-local" required /></label>
        <label>Encerramento (horário de Brasília)<input name="closesAt" type="datetime-local" required /></label>
        <label>Temporada <b>· Obrigatório para rodada regular</b><select name="seasonId"><option value="">Selecione uma temporada</option>{seasons.filter(item => !["closed","cancelled"].includes(item.status)).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select>{!seasons.some(item=>!["closed","cancelled"].includes(item.status))&&<small>Nenhuma temporada disponível. <a href="/admin/temporadas">Crie uma temporada</a> antes de agendar.</small>}</label>
        <label>Tipo<select name="roundType"><option value="regular">Rodada regular</option><option value="special">Evento especial</option></select></label>
        <label className="round-checkbox"><input type="checkbox" name="featured" /> Destacar na comunidade</label>
        <p className="utc-note">Informe no horário de Brasília. Exemplo: 19/07/2026 09:30.</p>
        <button className="advanced-toggle" type="button" onClick={() => setAdvanced(!advanced)}>{advanced ? "OCULTAR REGRAS AVANÇADAS" : "CONFIGURAR REGRAS AVANÇADAS"}</button>
        {advanced && <div className="advanced-rules"><label>Segundos por pergunta<input name="secondsPerQuestion" type="number" min="15" max="60" defaultValue="20" /></label><label>Tentativas oficiais<input name="officialAttemptLimit" type="number" min="1" max="5" defaultValue="2" /></label><label>Pontos base<input name="basePoints" type="number" min="100" max="1000" defaultValue="400" /></label><label>Pontos por segundo restante<input name="speedPointsPerSecond" type="number" min="0" max="100" defaultValue="40" /></label><label>Bônus por sequência<input name="streakBonus" type="number" min="0" max="300" defaultValue="100" /></label><label>Pontuação mínima no acerto<input name="minimumCorrectPoints" type="number" min="0" max="500" defaultValue="100" /></label><label className="round-checkbox"><input type="checkbox" name="allowPractice" /> Permitir tentativas de prática</label></div>}
        <div className="auto-compose-action"><button type="button" onClick={openComposer}>MONTAGEM AUTOMÁTICA PELO ACERVO</button><span>Preenche somente as posições ainda vazias.</span></div>
      </section>
      <div className="question-builder">{questions.map((question, index) => <section className="admin-panel edit-question" key={index}>
        <div className="panel-title"><div><small>PERGUNTA {index + 1}{question.bankQuestionId ? " · DO ACERVO" : ""}</small><h2>{question.prompt || "Nova pergunta"}</h2></div><button type="button" onClick={() => openBank(index, { page: 1 })}>USAR DO BANCO</button></div>
        <label>Referência<input value={question.reference} onChange={event => updateQuestion(index, { reference: event.target.value })} placeholder="Ex.: João 9" /></label>
        <label>Enunciado<textarea required value={question.prompt} onChange={event => updateQuestion(index, { prompt: event.target.value })} /></label>
        <div className="choice-editor">{question.choices.map((choice, choiceIndex) => <label key={choiceIndex} className={question.correctIndex === choiceIndex ? "chosen" : ""}>
          <input type="radio" name={`correct-${index}`} checked={question.correctIndex === choiceIndex} onChange={() => updateQuestion(index, { correctIndex: choiceIndex })} />
          <span>{String.fromCharCode(65 + choiceIndex)}</span>
          <input required value={choice} onChange={event => { const choices = [...question.choices]; choices[choiceIndex] = event.target.value; updateQuestion(index, { choices }); }} placeholder={`Alternativa ${String.fromCharCode(65 + choiceIndex)}`} />
        </label>)}</div>
        <label>Comentário após a resposta<textarea value={question.commentary} onChange={event => updateQuestion(index, { commentary: event.target.value })} /></label>
      </section>)}</div>
      <div className="publish-bar"><span>{message || "10 perguntas · 2 tentativas oficiais · 20 segundos"}</span><button className="primary" disabled={busy}>{busy ? "AGENDANDO..." : "AGENDAR JORNADA"}</button></div>
    </form>
    {picker && <div className="bank-editor-layer"><section className="bank-editor bank-picker"><header><div><h2>Escolher pergunta do banco</h2><small>{picker.total} resultado(s)</small></div><button type="button" onClick={() => setPicker(null)}>Fechar</button></header><form onSubmit={event => { event.preventDefault(); openBank(picker.index, { page: 1 }); }}><input maxLength={45} placeholder="Pesquisar enunciado ou referência" value={picker.search} onChange={event => setPicker({ ...picker, search: event.target.value })} /><select value={picker.theme} onChange={event => openBank(picker.index, { theme: event.target.value, page: 1 })}><option value="">Todos os temas</option>{[...new Set(picker.facets.map((item:any) => item.theme).filter(Boolean))].sort().map((value:any) => <option key={value}>{value}</option>)}</select><select value={picker.book} onChange={event => openBank(picker.index, { book: event.target.value, page: 1 })}><option value="">Todos os livros</option>{[...new Set(picker.facets.map((item:any) => item.book).filter(Boolean))].sort().map((value:any) => <option key={value}>{value}</option>)}</select><select value={picker.difficulty} onChange={event => openBank(picker.index, { difficulty: event.target.value, page: 1 })}><option value="">Dificuldade</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select><button className="save">PESQUISAR</button></form><div>{picker.items.map((item:any) => { const used = questions.some((question:any, position:number) => position !== picker.index && question.bankQuestionId === item.id); return <button className="bank-pick-item" disabled={used} type="button" key={item.id} onClick={() => chooseFromBank(item.id)}><small>{item.reference || item.theme}{used ? " · JÁ SELECIONADA" : ""}</small><strong>{item.prompt}</strong><span>{item.difficulty === "easy" ? "Fácil" : item.difficulty === "hard" ? "Difícil" : "Média"}</span></button>})}</div>{!picker.items.length && <p>Nenhuma pergunta encontrada para esse filtro.</p>}<nav className="bank-pagination"><button type="button" disabled={picker.page <= 1} onClick={() => openBank(picker.index, { page: picker.page - 1 })}>← Anterior</button><span>{picker.page} de {picker.totalPages}</span><button type="button" disabled={picker.page >= picker.totalPages} onClick={() => openBank(picker.index, { page: picker.page + 1 })}>Próxima →</button></nav></section></div>}
    {composer && <div className="bank-editor-layer"><section className="bank-editor compose-modal"><header><div><h2>Montagem automática</h2><p>Combine os filtros desejados. Campos vazios aceitam qualquer opção.</p></div><button type="button" onClick={() => setComposer(null)}>Fechar</button></header><div className="compose-filters"><label>Tema<select value={composer.theme} onChange={event => setComposer({ ...composer, theme: event.target.value })}><option value="">Qualquer tema</option>{[...new Set(composer.facets.map((item:any) => item.theme).filter(Boolean))].sort().map((value:any)=><option key={value}>{value}</option>)}</select></label><label>Livro<select value={composer.book} onChange={event => setComposer({ ...composer, book: event.target.value })}><option value="">Qualquer livro</option>{[...new Set(composer.facets.map((item:any) => item.book).filter(Boolean))].sort().map((value:any)=><option key={value}>{value}</option>)}</select></label><label>Categoria<select value={composer.category} onChange={event => setComposer({ ...composer, category: event.target.value })}><option value="">Qualquer categoria</option>{[...new Set(composer.facets.map((item:any) => item.category).filter(Boolean))].sort().map((value:any)=><option key={value}>{value}</option>)}</select></label><label>Dificuldade<select value={composer.difficulty} onChange={event => setComposer({ ...composer, difficulty: event.target.value })}><option value="">Qualquer dificuldade</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></label></div><footer><button type="button" onClick={() => setComposer(null)}>Cancelar</button><button className="save" disabled={composer.busy} onClick={composeAutomatically}>{composer.busy ? "MONTANDO..." : "PREENCHER POSIÇÕES VAZIAS"}</button></footer></section></div>}
  </main>;
}
