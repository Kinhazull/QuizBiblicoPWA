"use client";

import { useEffect, useState } from "react";
import { ProfilePrivacySections } from "../ProfilePrivacySections";
import { PlatformProfileOverview } from "./PlatformProfileOverview";
import { APP_VERSION } from "../app-version";

export default function Profile() {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [mfaStatus, setMfaStatus] = useState<"active" | "inactive" | "unavailable">("unavailable");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile/me", { cache: "no-store" }),
      fetch("/api/auth/mfa/status", { cache: "no-store" }),
    ]).then(async ([response, mfaResponse]) => {
      if (response.status === 401) { location.replace("/"); return; }
      setData(await response.json());
      if (mfaResponse.ok) {
        const status = await mfaResponse.json();
        setMfaStatus(status.active || status.status === "active" ? "active" : "inactive");
      }
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

  if (!data) return <main className="profile-shell profile-loading"><span aria-hidden="true" /><p role="status">Carregando seu perfil…</p></main>;
  const { user } = data;
  return <main className="profile-shell">
    <header className="profile-heading"><p className="eyebrow">MINHA CONTA</p><h1>Meu perfil</h1><p>Sua identidade, progresso e preferências em um só lugar.</p></header>
    <nav className="profile-section-nav" aria-label="Seções do perfil"><a href="#visao-geral">Visão geral</a><a href="#identidade">Identidade</a><a href="#seguranca">Segurança</a><a href="#privacidade">Privacidade</a></nav>
    <section id="visao-geral"><PlatformProfileOverview displayName={user.nickname || user.displayName} /></section>
    <form className="profile-section profile-form" id="identidade" onSubmit={save}><h2>Identidade e preferências</h2><label>Nome<input value={user.displayName} readOnly /></label><label>Apelido<input name="nickname" maxLength={30} defaultValue={user.nickname || ""} /></label><label>Biografia<textarea name="bio" maxLength={280} defaultValue={user.bio || ""} /></label><label>Livro bíblico favorito<input name="favoriteBook" maxLength={50} defaultValue={user.favoriteBook || ""} /></label><label>Versículo favorito<input name="favoriteVerse" maxLength={80} defaultValue={user.favoriteVerse || ""} /></label><label className="check-row"><input name="useNicknameInRanking" type="checkbox" defaultChecked={Boolean(user.useNicknameInRanking)} /> Usar meu apelido no ranking</label><label className="check-row"><input name="profilePublic" type="checkbox" defaultChecked={Boolean(user.profilePublic)} /> Permitir que participantes vejam meu perfil</label><button className="primary">Salvar perfil</button></form>
    {["owner","admin","leader"].includes(user.role)&&<section className="profile-section" id="seguranca"><h2>Verificação em duas etapas</h2><p>{mfaStatus === "active" ? "A verificação em duas etapas está ativa nesta conta." : "Proteja o acesso administrativo com um aplicativo autenticador e códigos de recuperação MFA."}</p><a className="secondary" href="/configurar-mfa">{mfaStatus === "active" ? "Ver estado do MFA" : "Configurar MFA"}</a></section>}
    <form className="profile-section profile-form" onSubmit={recovery}><h2>Códigos de recuperação da conta</h2><p>Estes seis códigos recuperam o acesso à conta e são diferentes dos códigos de recuperação do MFA.</p><label>Confirme sua senha atual<input name="password" type="password" required /></label><button className="secondary">Gerar seis códigos da conta</button>{codes.length > 0 && <div className="recovery-codes">{codes.map(code => <code key={code}>{code}</code>)}<button type="button" onClick={() => navigator.clipboard.writeText(codes.join("\n"))}>Copiar todos</button></div>}</form>
    <div id="privacidade">
    <ProfilePrivacySections role={user.role} />
    </div>
    <p className="app-version" aria-label={`Versão do aplicativo ${APP_VERSION}`}>Conte os Feitos · versão {APP_VERSION}</p>
    {message && <p className="auth-message" role="status">{message}</p>}
  </main>;
}
