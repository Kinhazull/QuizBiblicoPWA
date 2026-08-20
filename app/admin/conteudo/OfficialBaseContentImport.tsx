"use client";

import { useState } from "react";

type GameReport = {
  found: number; valid: number; invalid: number; duplicates: number;
  publishable: number; drafts: number;
};
type ImportResponse = {
  dryRun: boolean;
  byGame: Record<string, GameReport>;
  report: { migrated: number; alreadyMigrated: number; updatesRequired?: number; reconciled?: number };
  error?: string;
  supportId?: string;
};

const gameLabels: Record<string, string> = {
  "wordle-biblico": "Wordle Bíblico",
  "linha-do-tempo-biblica": "Linha do Tempo",
  "memoria-biblica": "Memória Bíblica",
  "associacao-de-temas": "Associação de Temas",
  "quem-sou-eu": "Quem Sou Eu?",
  "jogo-tres-pistas": "Três Pistas",
};

export function OfficialBaseContentImport() {
  const [data, setData] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");

  const execute = async (commit: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/import-official-base", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commit, confirmation: commit ? confirmation : undefined }),
      });
      const payload = await response.json() as ImportResponse;
      if (!response.ok) {
        const reference = [payload.error ?? "import_failed", payload.supportId].filter(Boolean).join(" · ");
        throw new Error(reference);
      }
      setData(payload);
    } catch (failure) {
      const reference = failure instanceof Error ? failure.message : "import_failed";
      setError(`Não foi possível executar a operação (${reference}). Nenhum conteúdo foi importado.`);
    } finally {
      setLoading(false);
    }
  };

  return <section className="content-shortcuts admin-panel" aria-labelledby="official-base-title">
    <header>
      <div>
        <p className="eyebrow">ACERVO OFICIAL</p>
        <h2 id="official-base-title">Conteúdo Base Oficial</h2>
        <p>Valide os seis pacotes permanentes antes de importá-los para esta organização.</p>
      </div>
      <div className="filter-actions">
        <button type="button" onClick={() => execute(false)} disabled={loading}>Executar dry-run</button>
        <button type="button" onClick={() => execute(true)} disabled={loading || !data?.dryRun || confirmation !== "IMPORTAR_CONTEUDO_BASE_OFICIAL"}>Aplicar importação</button>
      </div>
    </header>
    {data?.dryRun && <label className="universal-content-filters">
      Confirmação para aplicar
      <input
        value={confirmation}
        onChange={event => setConfirmation(event.target.value)}
        autoComplete="off"
        placeholder="IMPORTAR_CONTEUDO_BASE_OFICIAL"
      />
    </label>}
    {loading && <div className="cms-state loading" role="status"><span aria-hidden="true" />Processando pacotes oficiais…</div>}
    {error && <div className="cms-state error" role="alert">{error}</div>}
    {data && <>
      <p className="content-indicator" role="status">
        {data.dryRun
          ? `Dry-run concluído sem escrita. ${data.report.updatesRequired ?? 0} conteúdo(s) precisam ser reconciliados com o pacote oficial atual.`
          : `Importação concluída: ${data.report.migrated} novos; ${data.report.reconciled ?? 0} reconciliados; ${data.report.alreadyMigrated} já existentes.`}
      </p>
      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>Jogo</th><th>Encontrados</th><th>Válidos</th><th>Inválidos</th><th>Duplicados</th><th>Publicáveis</th><th>Drafts</th></tr></thead>
          <tbody>{Object.entries(data.byGame).map(([gameType, report]) => <tr key={gameType}>
            <th>{gameLabels[gameType] ?? gameType}</th><td>{report.found}</td><td>{report.valid}</td>
            <td>{report.invalid}</td><td>{report.duplicates}</td><td>{report.publishable}</td><td>{report.drafts}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
