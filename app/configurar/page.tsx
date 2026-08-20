"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "../BrandLogo";

export default function Setup() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/setup/bootstrap", { cache: "no-store" })
      .then(async response => {
        const data = response.ok ? await response.json() : null;
        if (data?.initialized) location.replace("/");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/setup/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bootstrap-secret": String(data.secret) },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setMessage("Configuração concluída! Redirecionando para o login...");
        setTimeout(() => location.replace("/"), 1_800);
      } else if (result.error === "already_initialized") {
        location.replace("/");
      } else if (result.error === "forbidden") {
        setMessage("A chave de inicialização está incorreta.");
      } else {
        setMessage(`Não foi possível configurar${result.error ? `: ${result.error}` : ". Tente novamente."}`);
      }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "A configuração excedeu 15 segundos. Tente novamente."
        : "Falha de comunicação com o servidor.");
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  if (checking) return <main className="platform-loading-screen"><p role="status">Verificando a plataforma…</p></main>;

  return <main className="shell auth-screen"><section className="auth-card setup-card"><header className="brand"><BrandLogo /></header><p className="eyebrow">PRIMEIRO ACESSO</p><h1>Configure sua <em>comunidade</em></h1><p className="intro">Esta tela funciona apenas uma vez e cria o administrador, o grupo e o primeiro convite.</p><form onSubmit={submit}><label>Nome da organização<input name="organizationName" required minLength={3} /></label><label>Nome do grupo<input name="groupName" defaultValue="Jovens" required /></label><label>Seu nome<input name="displayName" required /></label><label>Usuário administrador<input name="username" required /></label><label>Senha do administrador<input name="password" type="password" minLength={10} required /></label><label>Primeiro código de convite<input name="inviteCode" minLength={6} required /></label><label>Chave de inicialização<input name="secret" type="password" required /></label>{message && <p className="auth-message" role="status">{message}</p>}<button className="primary" disabled={busy}>{busy ? "CONFIGURANDO..." : "CRIAR PLATAFORMA"}<span>→</span></button></form><a className="auth-switch" href="/">Voltar ao login</a></section></main>;
}
