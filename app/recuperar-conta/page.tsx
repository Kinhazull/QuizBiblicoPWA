"use client";

import { useState } from "react";
import { BrandLogo } from "../BrandLogo";

export default function Recover() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.password !== data.confirm) {
      setMsg("As senhas não coincidem.");
      setBusy(false);
      return;
    }
    const response = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: data.username, code: data.code, password: data.password }),
    });
    setMsg(response.ok
      ? "Senha redefinida. Você já pode voltar e entrar."
      : "Código inválido, já utilizado ou dados incorretos.");
    setBusy(false);
  }

  return <main className="shell auth-screen"><section className="auth-card">
    <header className="brand"><BrandLogo /></header>
    <p className="eyebrow">RECUPERAÇÃO SEGURA</p>
    <h1>Volte para a <em>plataforma</em></h1>
    <p className="intro">Use um dos códigos pessoais que você guardou no perfil.</p>
    <form onSubmit={submit}>
      <label>Nome de usuário<input name="username" required autoCapitalize="none" /></label>
      <label>Código de recuperação<input name="code" required placeholder="XXXXX-XXXXX" autoCapitalize="characters" /></label>
      <label>Nova senha<input name="password" type="password" required minLength={10} /></label>
      <label>Repita a nova senha<input name="confirm" type="password" required minLength={10} /></label>
      {msg && <p className="auth-message">{msg}</p>}
      <button className="primary" disabled={busy}>{busy ? "AGUARDE..." : "REDEFINIR SENHA"}</button>
    </form>
    <a className="auth-switch" href="/">Voltar ao login</a>
  </section></main>;
}
