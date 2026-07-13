"use client";

import { useEffect, useState } from "react";

type User = { id: string; displayName: string; username: string; role: string; status: string; createdAt: number };
type Invitation = { id: string; label: string; uses: number; maxUses: number | null; active: boolean };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]); const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  const [shareLink, setShareLink] = useState("");
  async function load() {
    const [u, i] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/invitations")]);
    if (u.status === 401 || u.status === 403) { location.href = "/"; return; }
    setUsers((await u.json()).users || []); setInvitations((await i.json()).invitations || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  async function updateUser(userId: string, status: string) {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, status }) }); await load();
  }
  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: data.code, label: data.label, maxUses: data.maxUses ? Number(data.maxUses) : null }) });
    const result = await response.json();
    if (response.ok) { setShareLink(`${location.origin}/?convite=${encodeURIComponent(result.code)}`); setMessage("Código criado. O link está pronto para compartilhar."); form.reset(); await load(); }
    else setMessage("Não foi possível criar o código.");
  }
  return <main className="admin-shell">
    <header className="admin-head"><div className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</div><nav><a href="/admin/rodadas/lista">Rodadas</a> · <a href="/admin/rodadas">Nova rodada</a> · <a href="/">App</a></nav></header>
    <section className="admin-title"><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>Comunidade e <em>acessos</em></h1><p>Aprove novos participantes e gerencie os convites do grupo.</p></section>
    {loading ? <p>Carregando...</p> : <div className="admin-grid">
      <section className="admin-panel"><div className="panel-title"><div><small>USUÁRIOS</small><h2>Solicitações pendentes</h2></div><b>{users.filter(u => u.status === "pending").length}</b></div>
        <div className="user-list">{users.filter(u => u.status === "pending").map(user => <article key={user.id}><span>{user.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>@{user.username}</small></div><button onClick={() => updateUser(user.id,"rejected")} className="reject">Recusar</button><button onClick={() => updateUser(user.id,"active")}>Aprovar</button></article>)}{!users.some(u => u.status === "pending") && <p className="empty">Nenhuma solicitação pendente.</p>}</div>
      </section>
      <section className="admin-panel"><div className="panel-title"><div><small>CONVITES</small><h2>Novo código</h2></div></div>
        <form className="invite-form" onSubmit={createInvite}><label>Identificação<input name="label" required placeholder="Ex.: Encontro de agosto" /></label><label>Código<input name="code" required minLength={6} placeholder="Ex.: FAROL-2026" /></label><label>Limite de usos<input name="maxUses" type="number" min="1" placeholder="Sem limite" /></label><button className="primary">CRIAR CÓDIGO</button>{message && <p>{message}</p>}{shareLink&&<div className="share-invite"><input readOnly value={shareLink}/><button type="button" onClick={()=>navigator.clipboard.writeText(shareLink)}>COPIAR LINK</button><a href={`https://wa.me/?text=${encodeURIComponent(`Use este link para entrar na Jornada Bíblica: ${shareLink}`)}`} target="_blank" rel="noreferrer">WHATSAPP</a></div>}</form>
        <div className="invite-list">{invitations.map(invite => <div key={invite.id}><span><b>{invite.label}</b><small>{invite.uses}{invite.maxUses ? ` de ${invite.maxUses}` : " usos"}</small></span><i className={invite.active ? "active" : ""}>{invite.active ? "Ativo" : "Inativo"}</i></div>)}</div>
      </section>
      <section className="admin-panel full"><div className="panel-title"><div><small>MEMBROS</small><h2>Participantes aprovados</h2></div><b>{users.filter(u => u.status === "active").length}</b></div>
        <div className="member-table">{users.filter(u => u.status === "active").map(user => <div key={user.id}><strong>{user.displayName}</strong><span>@{user.username}</span><em>{user.role}</em>{user.role === "participant" && <button onClick={() => updateUser(user.id,"suspended")}>Suspender</button>}</div>)}</div>
      </section>
    </div>}
  </main>;
}
