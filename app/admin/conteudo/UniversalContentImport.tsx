"use client";
import { FormEvent, useState } from "react";
export function UniversalContentImport() { const [report, setReport] = useState<Record<string, unknown> | null>(null); const [applying, setApplying] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const confirmation = applying ? window.prompt("Digite IMPORTAR_CONTEUDO_UNIVERSAL para aplicar:") : undefined;
    const response = await fetch("/api/admin/content/import", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ format: form.get("format"), data: form.get("data"), confirmation }) });
    setReport(await response.json()); setApplying(false); };
  return <form className="admin-panel universal-import" onSubmit={submit}><header><div><p className="eyebrow">IMPORTACAO UNIVERSAL</p><h2>JSON ou CSV</h2></div></header>
    <label>Formato<select name="format"><option>JSON</option><option>CSV</option></select></label><label>Dados<textarea name="data" required rows={8} /></label>
    <div><button type="submit" onClick={() => setApplying(false)}>Executar dry-run</button><button type="submit" onClick={() => setApplying(true)}>Aplicar com confirmacao</button></div>
    {report && <pre aria-live="polite">{JSON.stringify(report, null, 2)}</pre>}</form>; }
