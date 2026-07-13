"use client";

import { useState } from "react";

type Question = {
  reference: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  commentary: string;
};

type Header = {
  title: string;
  theme: string;
  description: string;
  opensAt: string;
  closesAt: string;
  secondsPerQuestion: string;
};

const emptyHeader: Header = {
  title: "",
  theme: "",
  description: "",
  opensAt: "",
  closesAt: "",
  secondsPerQuestion: "20",
};

function clean(value: string) {
  return value.trim().replace(/^\*\*|\*\*$/g, "").trim();
}

function normalizeDate(value: string) {
  const date = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) return date;
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}` : "";
}

function parseHeader(text: string): Header {
  const beforeQuestions = text.replace(/\r/g, "").split(/(?=Pergunta\s+\d+)/i)[0];
  const header = { ...emptyHeader };
  const aliases: Array<[keyof Header, RegExp]> = [
    ["title", /^(?:t[ií]tulo)\s*:\s*(.+)$/i],
    ["theme", /^(?:tema)\s*:\s*(.+)$/i],
    ["description", /^(?:apresenta[cç][aã]o|descri[cç][aã]o)\s*:\s*(.+)$/i],
    ["opensAt", /^(?:libera[cç][aã]o|abertura)(?:\s*\(utc\))?\s*:\s*(.+)$/i],
    ["closesAt", /^(?:encerramento|fechamento)(?:\s*\(utc\))?\s*:\s*(.+)$/i],
    ["secondsPerQuestion", /^(?:segundos(?:\s+por\s+pergunta)?|tempo(?:\s+por\s+pergunta)?)\s*:\s*(\d+)\s*(?:s|segundos?)?$/i],
  ];

  for (const rawLine of beforeQuestions.split("\n")) {
    const line = clean(rawLine);
    for (const [key, expression] of aliases) {
      const match = line.match(expression);
      if (!match) continue;
      const value = clean(match[1]);
      header[key] = key === "opensAt" || key === "closesAt" ? normalizeDate(value) : value;
      break;
    }
  }
  return header;
}

function parseQuestions(text: string): Question[] {
  return text.replace(/\r/g, "")
    .split(/(?=Pergunta\s+\d+)/i)
    .filter(block => /^Pergunta\s+\d+/i.test(block.trim()))
    .map(block => {
      const lines = block.split("\n").map(clean).filter(Boolean);
      const choices: string[] = [];
      let correctIndex = -1;
      let commentary = "";
      let reference = "";

      for (const line of lines) {
        const choice = line.match(/^(?:✅\s*)?([A-D])[)\-.]\s*(.+)$/i);
        if (choice) {
          const index = choice[1].toUpperCase().charCodeAt(0) - 65;
          choices[index] = clean(choice[2]);
          if (line.startsWith("✅")) correctIndex = index;
        }
        const answer = line.match(/^Resposta:\s*([A-D])/i);
        if (answer) correctIndex = answer[1].toUpperCase().charCodeAt(0) - 65;
        if (/^Coment[aá]rio:/i.test(line)) commentary = line.replace(/^Coment[aá]rio:\s*/i, "");
        const foundReference = line.match(/\b(?:João|Atos|Salmos|Lucas|Mateus|Marcos|Romanos|Gênesis|Êxodo)\s+\d+(?::\d+)?/i);
        if (foundReference && !reference) reference = foundReference[0];
      }

      const prompt = lines.slice(1).find(line => !(/^(?:✅\s*)?[A-D][)\-.]|^(Resposta|Coment[aá]rio):/i.test(line))) || "";
      return { reference, prompt, choices, correctIndex, commentary };
    })
    .filter(question => question.prompt && question.choices.length === 4 && question.correctIndex >= 0);
}

export default function Import() {
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [header, setHeader] = useState<Header>(emptyHeader);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function preview() {
    const parsedQuestions = parseQuestions(text);
    const parsedHeader = parseHeader(text);
    setQuestions(parsedQuestions);
    setHeader(parsedHeader);
    const headerCount = [parsedHeader.title, parsedHeader.theme, parsedHeader.description, parsedHeader.opensAt, parsedHeader.closesAt].filter(Boolean).length;
    setMessage(parsedQuestions.length === 10
      ? `Dez perguntas reconhecidas${headerCount ? ` e ${headerCount} campo(s) do cabeçalho preenchido(s)` : ""}. Revise antes de agendar.`
      : `${parsedQuestions.length} pergunta(s) válida(s); são necessárias 10.`);
  }

  function update(index: number, patch: Partial<Question>) {
    setQuestions(current => current.map((question, position) => position === index ? { ...question, ...patch } : question));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (questions.length !== 10 || busy) return;
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        theme: data.theme,
        description: data.description,
        opensAt: data.opensAt,
        closesAt: data.closesAt,
        secondsPerQuestion: Number(data.secondsPerQuestion) || 20,
        questions,
      }),
    });
    const result = await response.json();
    if (response.ok) {
      setMessage("Rodada criada. Abrindo os detalhes...");
      location.replace(`/admin/rodadas/detalhes?id=${result.roundId}`);
      return;
    }
    setMessage("Não foi possível agendar. Revise os dados.");
    setBusy(false);
  }

  return <main className="admin-shell">
    <section className="admin-title"><p className="eyebrow">IMPORTAÇÃO RÁPIDA</p><h1>Cole sua <em>rodada</em></h1></section>
    {!questions.length && <section className="admin-panel import-panel">
      <textarea value={text} onChange={event => setText(event.target.value)} placeholder={"Título: Contem o que Deus fez\nTema: Testemunhos e milagres\nApresentação: Uma breve introdução\nLiberação (UTC): 2026-07-19 12:30\nEncerramento (UTC): 2026-07-26 12:29\nSegundos por pergunta: 20\n\nPergunta 1\nQual era...?\nA) ...\nB) ...\nC) ...\nD) ...\nResposta: C\nComentário: ..."} />
      <p className="import-help">O cabeçalho é opcional. Use uma informação por linha, seguida de dois-pontos. Datas podem ser informadas como AAAA-MM-DD HH:MM ou DD/MM/AAAA HH:MM, sempre em UTC.</p>
      <button className="primary" onClick={preview}>INTERPRETAR E REVISAR</button>
      {message && <p className="auth-message">{message}</p>}
    </section>}
    {questions.length > 0 && <form className="import-form round-form" onSubmit={submit}>
      <section className="admin-panel round-basics">
        <label>Título<input name="title" required defaultValue={header.title} placeholder="Ex.: Contem o que Deus fez" /></label>
        <label>Tema<input name="theme" required defaultValue={header.theme} placeholder="Testemunhos e milagres" /></label>
        <label className="wide">Apresentação<textarea name="description" defaultValue={header.description} placeholder="Uma breve introdução para os participantes" /></label>
        <label>Liberação (UTC)<input name="opensAt" type="datetime-local" required defaultValue={header.opensAt} /></label>
        <label>Encerramento (UTC)<input name="closesAt" type="datetime-local" required defaultValue={header.closesAt} /></label>
        <label>Segundos por pergunta<select name="secondsPerQuestion" defaultValue={header.secondsPerQuestion}><option>15</option><option>20</option><option>25</option><option>30</option></select></label>
        <p className="utc-note">Preencha em UTC. Após salvar, o sistema exibirá o horário convertido para Brasília.</p>
      </section>
      <section className="import-preview">{questions.map((question, index) => <article className="admin-panel" key={index}>
        <small>PERGUNTA {index + 1}</small>
        <input value={question.reference} onChange={event => update(index, { reference: event.target.value })} placeholder="Referência" />
        <textarea value={question.prompt} onChange={event => update(index, { prompt: event.target.value })} />
        {question.choices.map((choice, choiceIndex) => <label className={choiceIndex === question.correctIndex ? "correct-preview" : ""} key={choiceIndex}>
          <input type="radio" name={`answer-${index}`} checked={choiceIndex === question.correctIndex} onChange={() => update(index, { correctIndex: choiceIndex })} />
          <input value={choice} onChange={event => { const choices = [...question.choices]; choices[choiceIndex] = event.target.value; update(index, { choices }); }} />
        </label>)}
        <textarea value={question.commentary} onChange={event => update(index, { commentary: event.target.value })} placeholder="Comentário" />
      </article>)}</section>
      <div className="publish-bar"><span>{message}</span><button className="primary" disabled={busy}>{busy ? "AGENDANDO..." : "CONFIRMAR E AGENDAR"}</button></div>
    </form>}
  </main>;
}
