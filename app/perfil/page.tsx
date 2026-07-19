"use client";

import { useEffect, useState } from "react";
import { ProfilePrivacySections } from "../ProfilePrivacySections";

export default function Profile() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/profile/me", { cache: "no-store" }).then(async response => {
      if (response.status === 401) { location.replace("/"); return; }
      setData(await response.json());
    });
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/profile/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: form.nickname, bio: form.bio, favoriteBook: form.favoriteBook, favoriteVerse: form.favoriteVerse, useNicknameInRanking: form.useNicknameInRanking === "on", profilePublic: form.profilePublic === "on" }) });
    setMessage(response.ok ? "Perfil atualizado com sucesso." : "Confira o tamanho dos campos.");
  }

  async function recovery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm("Os códigos anteriores deixarão de funcionar. Deseja continuar?")) return;
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const response = await fetch("/api/auth/recovery-codes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (response.ok) setCodes(result.codes); else setMessage("Senha atual incorreta.");
  }

  if (!data) return <main className="profile-shell"><p role="status">Carregando perfil…</p></main>;
  const { user, stats, progress } = data;
  return <main className="profile-shell">
    <header className="profile-heading"><p className="eyebrow">MEU PERFIL</p><h1>{user.nickname || user.displayName}</h1><p>{stats.roundsPlayed || 0} rodada(s) concluída(s)</p></header>
    <section className="profile-section" aria-labelledby="platform-progress-title"><h2 id="platform-progress-title">Progresso na plataforma</h2><div className="profile-stats"><article><small>Nível</small><strong>{progress?.level || 1}</strong></article><article><small>XP total</small><strong>{Number(progress?.totalXp || 0).toLocaleString("pt-BR")}</strong></article><article><small>Moedas</small><strong>{Number(progress?.coins || 0).toLocaleString("pt-BR")}</strong></article></div></section>
    <section className="profile-stats"><article><small>Melhor pontuação</small><strong>{Number(stats.bestScore || 0).toLocaleString("pt-BR")}</strong></article><article><small>Acertos</small><strong>{stats.totalCorrect || 0}</strong></article><article><small>Maior sequência</small><strong>{stats.bestStreak || 0}</strong></article><article><small>Pódios</small><strong>{stats.podiums || 0}</strong></article></section>
    <form className="profile-section profile-form" onSubmit={save}><h2>Perfil</h2><label>Nome<input value={user.displayName} readOnly /></label><label>Apelido<input name="nickname" maxLength={30} defaultValue={user.nickname || ""} /></label><label>Biografia<textarea name="bio" maxLength={280} defaultValue={user.bio || ""} /></label><label>Livro bíblico favorito<input name="favoriteBook" maxLength={50} defaultValue={user.favoriteBook || ""} /></label><label>Versículo favorito<input name="favoriteVerse" maxLength={80} defaultValue={user.favoriteVerse || ""} /></label><label className="check-row"><input name="useNicknameInRanking" type="checkbox" defaultChecked={Boolean(user.useNicknameInRanking)} /> Usar meu apelido no ranking</label><label className="check-row"><input name="profilePublic" type="checkbox" defaultChecked={Boolean(user.profilePublic)} /> Permitir que participantes vejam meu perfil</label><button className="primary">Salvar perfil</button></form>
    <form className="profile-section profile-form" onSubmit={recovery}><h2>Códigos de recuperação</h2><label>Confirme sua senha atual<input name="password" type="password" required /></label><button className="secondary">Gerar seis códigos</button>{codes.length > 0 && <div className="recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}<button type="button" onClick={() => navigator.clipboard.writeText(codes.join("\n"))}>Copiar todos</button></div>}</form>
    <ProfilePrivacySections role={user.role} />{message && <p className="auth-message" role="status">{message}</p>}
  </main>;
}
