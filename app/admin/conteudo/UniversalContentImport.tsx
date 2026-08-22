"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

const CONFIRMATION = "IMPORTAR_CONTEUDO_UNIVERSAL";
const JSON_TEMPLATE = JSON.stringify([{
  externalId: "meu-id-estavel-001",
  gameType: "wordle-biblico",
  status: "DRAFT",
  metadata: { category: "Conceitos", difficulty: "EASY", biblicalReference: "Efésios 2:8", tags: ["Novo Testamento", "Conceitos"] },
  payload: { word: "GRACA", hint: "Favor imerecido concedido por Deus." },
}], null, 2);
const CSV_TEMPLATE = `externalId,gameType,status,category,difficulty,biblicalReference,tags,payload
meu-id-estavel-001,wordle-biblico,DRAFT,Conceitos,EASY,Efésios 2:8,Novo Testamento|Conceitos,"{""word"":""GRACA"",""hint"":""Favor imerecido concedido por Deus.""}"`;

type ImportReport = {
  dryRun?: boolean; found?: number; valid?: number; invalid?: number;
  duplicates?: number; published?: number; drafts?: number;
  errors?: Array<{ item?: number; externalId?: string; code?: string; message?: string; errors?: unknown }>;
  error?: string;
};
const reportLabels: Array<[keyof ImportReport, string]> = [
  ["found", "Encontrados"], ["valid", "Válidos"], ["invalid", "Inválidos"],
  ["duplicates", "Duplicados"], ["published", "Publicados"], ["drafts", "Rascunhos"],
];

export function UniversalContentImport() {
  const [format, setFormat] = useState<"JSON" | "CSV">("JSON");
  const [data, setData] = useState("");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [validatedData, setValidatedData] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"dry-run" | "apply" | null>(null);
  const dryRunReady = useMemo(() => report?.dryRun === true && validatedData === data && (report.found ?? 0) > 0 && (report.invalid ?? 0) === 0, [data, report, validatedData]);

  const resetValidation = () => { setReport(null); setValidatedData(null); setConfirmation(""); };
  const loadTemplate = () => { setData(format === "JSON" ? JSON_TEMPLATE : CSV_TEMPLATE); setFileName(""); resetValidation(); };
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormat(file.name.toLowerCase().endsWith(".csv") ? "CSV" : "JSON");
    setData(await file.text()); setFileName(file.name); resetValidation();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const applying = submitter instanceof HTMLButtonElement && submitter.value === "apply";
    if (applying && confirmation !== CONFIRMATION) { setReport({ error: "Digite a confirmação exatamente como indicada." }); return; }
    setBusy(applying ? "apply" : "dry-run");
    try {
      const response = await fetch("/api/admin/content/import", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, data, confirmation: applying ? confirmation : undefined }),
      });
      const nextReport = (await response.json()) as ImportReport;
      setReport(nextReport);
      if (!applying && response.ok) setValidatedData(data);
      if (applying && response.ok) { setValidatedData(null); setConfirmation(""); }
    } catch { setReport({ error: "Não foi possível consultar o importador. Tente novamente." }); }
    finally { setBusy(null); }
  };

  return <form className="admin-panel universal-import" onSubmit={submit}>
    <header className="universal-import-heading"><div><p className="eyebrow">IMPORTAÇÃO UNIVERSAL</p><h2>Importar conteúdo em lote</h2><p>Valide o arquivo primeiro. O dry-run não grava nada e mostra o que pode ser importado antes da confirmação final.</p></div></header>
    <ol className="universal-import-steps" aria-label="Etapas da importação">
      <li><strong>1. Prepare</strong><span>Escolha JSON ou CSV e carregue os conteúdos.</span></li>
      <li><strong>2. Valide</strong><span>Execute o dry-run e corrija itens inválidos.</span></li>
      <li><strong>3. Importe</strong><span>Confirme a operação administrativa.</span></li>
    </ol>

    <section className="universal-import-input" aria-labelledby="import-data-title">
      <div className="universal-import-section-heading"><div><span className="universal-import-step-number">1</span><div><h3 id="import-data-title">Dados de entrada</h3><p>Envie um arquivo ou cole os dados no campo.</p></div></div><button type="button" className="button-secondary" onClick={loadTemplate}>Carregar modelo {format}</button></div>
      <div className="universal-import-controls">
        <label>Formato<select value={format} onChange={(event) => { setFormat(event.target.value as "JSON" | "CSV"); resetValidation(); }}><option value="JSON">JSON</option><option value="CSV">CSV</option></select></label>
        <label className="universal-import-file">Arquivo (.json ou .csv)<input type="file" accept=".json,.csv,application/json,text/csv" onChange={readFile} />{fileName && <span>Arquivo carregado: {fileName}</span>}</label>
      </div>
      <details className="universal-import-help"><summary>Quais campos devo preencher?</summary>
        {format === "JSON" ? <p>Envie uma lista de objetos com <code>externalId</code>, <code>gameType</code>, <code>status</code>, <code>metadata</code> e <code>payload</code>. O payload segue o schema do jogo escolhido.</p> : <p>Use as colunas <code>externalId, gameType, status, category, difficulty, biblicalReference, tags, payload</code>. Separe tags com <code>|</code> e escreva payload como JSON válido.</p>}
        <p>Use <strong>DRAFT</strong> para revisar no CMS ou <strong>PUBLISHED</strong> para publicar itens válidos. O servidor revalida todos os conteúdos.</p>
      </details>
      <label>Dados<textarea value={data} onChange={(event) => { setData(event.target.value); resetValidation(); }} required rows={12} spellCheck={false} placeholder={format === "JSON" ? "Cole aqui uma lista JSON…" : "Cole aqui o CSV com cabeçalho…"} /></label>
    </section>

    <section className="universal-import-action" aria-labelledby="dry-run-title">
      <div className="universal-import-section-heading"><div><span className="universal-import-step-number">2</span><div><h3 id="dry-run-title">Validar sem gravar</h3><p>O dry-run é seguro: nenhuma alteração é feita no CMS.</p></div></div></div>
      <button type="submit" name="intent" value="dry-run" disabled={!data.trim() || busy !== null}>{busy === "dry-run" ? "Validando…" : "Executar dry-run"}</button>
    </section>

    {report && <section className={`universal-import-report${report.error ? " is-error" : ""}`} aria-live="polite">
      <h3>{report.error ? "Não foi possível continuar" : report.dryRun ? "Resultado da validação" : "Resultado da importação"}</h3>
      {report.error ? <p>{report.error}</p> : <><div className="universal-import-report-grid">{reportLabels.map(([key, label]) => typeof report[key] === "number" && <div key={key}><strong>{report[key] as number}</strong><span>{label}</span></div>)}</div>
        {report.errors && report.errors.length > 0 && <details open><summary>Problemas encontrados ({report.errors.length})</summary><ul>{report.errors.map((error, index) => <li key={`${error.externalId ?? error.item ?? "item"}-${index}`}><strong>{error.externalId ?? `Item ${error.item ?? index + 1}`}</strong>: {error.message ?? error.code ?? (Array.isArray(error.errors) ? error.errors.map(value => typeof value === "object" && value && "message" in value ? String(value.message) : String(value)).join("; ") : "Conteúdo inválido")}</li>)}</ul></details>}
        {report.dryRun && !dryRunReady && (report.found ?? 0) === 0 && <p>Nenhum conteúdo foi encontrado. Confira o formato e carregue dados antes de importar.</p>}</>}
    </section>}

    <section className={`universal-import-confirm${dryRunReady ? " is-ready" : ""}`} aria-labelledby="apply-title">
      <div className="universal-import-section-heading"><div><span className="universal-import-step-number">3</span><div><h3 id="apply-title">Confirmar importação</h3><p>{dryRunReady ? "A validação passou. Confirme para gravar os conteúdos." : "Esta etapa será liberada após um dry-run válido dos dados atuais."}</p></div></div></div>
      <label>Digite <code>{CONFIRMATION}</code><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={!dryRunReady || busy !== null} autoComplete="off" /></label>
      <button type="submit" name="intent" value="apply" disabled={!dryRunReady || confirmation !== CONFIRMATION || busy !== null}>{busy === "apply" ? "Importando…" : "Aplicar importação"}</button>
    </section>
  </form>;
}
