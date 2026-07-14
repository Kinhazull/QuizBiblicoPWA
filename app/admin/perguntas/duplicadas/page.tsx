"use client";
import { useEffect, useState } from "react";
import QuestionEditorModal from "../QuestionEditorModal";

export default function Similar() {
  const [data, setData] = useState<any>(null), [editing, setEditing] = useState<string | null>(null), [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/admin/questions/similar"); if (!response.ok) { location.href = "/admin/perguntas"; return; } setData(await response.json()); }
  useEffect(() => { load(); }, []);
  async function archive(id: string) { if (!confirm("Excluir esta pergunta do acervo? Ela será arquivada e deixará de aparecer em novas rodadas.")) return; const response = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" }); setMessage(response.ok ? "Pergunta arquivada." : "Não foi possível arquivar."); if (response.ok) load(); }
  const question = (item: any) => <span><small>{item.reference} · {item.theme}</small><strong>{item.prompt}</strong><div><button onClick={() => setEditing(item.id)}>EDITAR</button><button className="danger" onClick={() => archive(item.id)}>EXCLUIR</button></div></span>;
  return <main className="admin-shell"><section className="admin-title"><p className="eyebrow">QUALIDADE DO ACERVO</p><h1>Perguntas <em>semelhantes</em></h1><p>Revise, edite ou arquive possíveis duplicidades diretamente nesta página.</p></section>{message && <p className="auth-message">{message}</p>}{!data ? <section className="admin-panel bank-empty">Comparando o acervo...</section> : <><p className="similar-summary">{data.pairs.length} par(es) encontrado(s) entre {data.scanned} perguntas analisadas.</p><section className="similar-list">{data.pairs.map((pair: any, index: number) => <article className="admin-panel" key={index}><b>{pair.similarity}% semelhantes</b><div>{question(pair.first)}{question(pair.second)}</div></article>)}{!data.pairs.length && <div className="admin-panel bank-empty">Nenhuma possível duplicidade encontrada.</div>}</section></>}{editing && <QuestionEditorModal id={editing} onClose={() => setEditing(null)} onChanged={() => { setMessage("Pergunta atualizada."); load(); }}/>}</main>;
}
