"use client";

import { useEffect, useState } from "react";

export default function Reports() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [roundId, setRoundId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [backupOpen, setBackupOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/rounds").then(response => {
      if (response.status === 401 || response.status === 403) {
        location.href = "/";
        return null;
      }
      return response.json();
    }).then(data => data && setRounds(data.rounds || []));
  }, []);

  const download = (type: string) => {
    location.href = `/api/admin/exports?type=${type}${type === "results" && roundId ? `&roundId=${encodeURIComponent(roundId)}` : ""}`;
  };

  async function backup(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const result = await response.json();
      setMessage(result.error === "invalid_password" ? "Senha administrativa incorreta." : "Não foi possível gerar o backup.");
      setBusy(false);
      return;
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "conte-os-feitos-backup.json";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setPassword("");
    setBackupOpen(false);
    setBusy(false);
    setMessage("Backup gerado. Guarde o arquivo em local privado.");
  }

  return <main className="admin-shell">
    <section className="admin-title"><p className="eyebrow">RELATÓRIOS E SEGURANÇA</p><h1>Exportar <em>dados</em></h1><p>Baixe relatórios para análise ou gere uma cópia completa de segurança.</p></section>
    {message && <p className="auth-message report-message">{message}</p>}
    <section className="report-grid">
      <article className="admin-panel"><b>👥</b><h2>Membros</h2><p>Nome, usuário, apelido, situação e datas de acesso.</p><button onClick={() => download("members")}>BAIXAR MEMBROS</button></article>
      <article className="admin-panel"><b>🏆</b><h2>Ranking geral</h2><p>Pontuação acumulada, média e rodadas concluídas.</p><button onClick={() => download("ranking")}>BAIXAR RANKING</button></article>
      <article className="admin-panel"><b>📝</b><h2>Resultados</h2><p>Tentativas, pontos, acertos, tempo e sequência.</p><select value={roundId} onChange={event => setRoundId(event.target.value)}><option value="">Todas as rodadas</option>{rounds.map(round => <option key={round.id} value={round.id}>{round.title}</option>)}</select><button onClick={() => download("results")}>BAIXAR RESULTADOS</button></article>
      <article className="admin-panel"><b>🛡️</b><h2>Histórico administrativo</h2><p>Últimas cinco mil ações registradas para auditoria.</p><button onClick={() => download("audit")}>BAIXAR HISTÓRICO</button></article>
      <article className="admin-panel"><b>🔄</b><h2>Continuidade das partidas</h2><p>Tentativas concluídas, em andamento, abandonadas e retomadas, com quantidade de respostas já salvas.</p><button onClick={() => download("continuity")}>BAIXAR CONTINUIDADE</button></article>
      <article className="admin-panel backup-card"><b>💾</b><h2>Backup completo</h2><p>Cópia confidencial dos membros, rodadas, perguntas, resultados, medalhas e configurações. Sessões ativas não são incluídas.</p><button onClick={() => setBackupOpen(true)}>GERAR BACKUP</button></article>
    </section>
    {backupOpen && <div className="modal-layer"><form className="admin-panel removal-modal backup-modal" onSubmit={backup}>
      <h2>Gerar backup completo?</h2>
      <p>O arquivo contém dados confidenciais e credenciais protegidas. Guarde-o em local privado e não compartilhe por grupos ou redes sociais.</p>
      <label>Senha administrativa<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoFocus /></label>
      <div><button type="button" onClick={() => { setBackupOpen(false); setPassword(""); }}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "GERANDO..." : "CONFIRMAR E BAIXAR"}</button></div>
    </form></div>}
  </main>;
}
