"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PlatformHome, type PlatformBadgeData } from "./PlatformHome";
import type { JourneyCardData } from "./journey-card-state";

const LEGAL_VERSION = "2026-07-13";

export default function Home() {
  const { user, loading: authLoading, setAuthenticatedUser } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [journey, setJourney] = useState<JourneyCardData | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [badges, setBadges] = useState<PlatformBadgeData | null>(null);

  useEffect(() => {
    const invite = new URLSearchParams(location.search).get("convite");
    if (invite) setAuthMode("register");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
  }, []);

  useEffect(() => {
    if (user?.mustChangePassword) location.href = "/alterar-senha";
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/rounds/status").then(response => response.ok ? response.json() : null).then(setJourney);
    fetch("/api/badges").then(response => response.ok ? response.json() : null).then(data => data && setBadges(data));
    const timer = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [user]);

  function remaining(target?: number) {
    if (!target) return "Aguardando agendamento";
    const seconds = Math.max(0, Math.floor((target - clock) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}min`;
  }

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = authMode === "login"
      ? { username: data.username, password: data.password, persistent: data.persistent === "on" }
      : { displayName: data.displayName, username: data.username, password: data.password, inviteCode: data.inviteCode, legalAccepted: data.legalAccepted === "on", termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION };
    try {
      const response = await fetch(`/api/auth/${authMode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        const messages: any = { invalid_credentials: "Usuário ou senha incorretos.", pending_approval: "Seu cadastro ainda aguarda aprovação.", account_unavailable: "Esta conta não está disponível.", invalid_invitation: "O código de convite é inválido ou expirou.", invitation_limit: "O limite de cadastros deste convite foi atingido.", username_unavailable: "Este nome de usuário já está em uso.", invalid_fields: "Confira os dados. A senha deve ter pelo menos 10 caracteres.", legal_consent_required: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.", too_many_attempts: "Muitas tentativas incorretas. O acesso foi protegido por 15 minutos." };
        const extra = result.error === "invalid_credentials" && result.attemptsRemaining <= 2 ? ` Restam ${result.attemptsRemaining} tentativa(s) antes do bloqueio temporário.` : "";
        setAuthError((messages[result.error] || "Não foi possível continuar.") + extra);
        return;
      }
      if (authMode === "register") {
        setAuthError(result.status === "pending" ? "Cadastro enviado! Aguarde a aprovação do líder." : "Cadastro aprovado. Agora entre com sua conta.");
        setAuthMode("login");
        return;
      }
      if (result.mustChangePassword) { location.href = "/alterar-senha"; return; }
      setAuthenticatedUser(result.user);
    } catch {
      setAuthError("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setAuthBusy(false);
    }
  }

  if (authLoading) return <main className="shell auth-screen"><div className="auth-loading"><span className="brand-dot">✦</span><p>Preparando sua jornada...</p></div></main>;

  if (!user) return <main className="shell auth-screen"><div className="ambient one"/><div className="ambient two"/><section className="auth-card"><header className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</header><p className="eyebrow">JORNADA BÍBLICA</p><h1>{authMode === "login" ? <>Que bom ter você<br/><em>de volta</em></> : <>Entre para a<br/><em>jornada</em></>}</h1><p className="intro">{authMode === "login" ? "Acesse sua conta para jogar a rodada da semana e acompanhar sua jornada." : "Use o código do seu grupo. Seu cadastro será analisado por um líder."}</p><form onSubmit={submitAuth}>{authMode === "register" && <label>Seu nome<input name="displayName" autoComplete="name" required minLength={3} placeholder="Nome e sobrenome"/></label>}{authMode === "register" && <label>Código do grupo<input name="inviteCode" autoCapitalize="characters" required placeholder="Ex.: FAROL-2026" defaultValue={new URLSearchParams(location.search).get("convite") || ""}/></label>}<label>Nome de usuário<input name="username" autoCapitalize="none" autoComplete="username" required minLength={3} placeholder="Como você vai entrar"/></label><label>Senha<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={10} placeholder="Mínimo de 10 caracteres"/></label>{authMode === "login" && <label className="remember"><input name="persistent" type="checkbox"/> Permanecer conectado neste aparelho</label>}{authMode === "register" && <label className="legal-consent"><input name="legalAccepted" type="checkbox" required/><span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label>}{authError && <p className="auth-message" role="status" aria-live="polite">{authError}</p>}<button className="primary" disabled={authBusy}>{authBusy ? "AGUARDE..." : authMode === "login" ? "ENTRAR" : "CRIAR MINHA CONTA"}<span>→</span></button></form><button className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button><nav className="legal-links" aria-label="Documentos legais"><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></nav></section></main>;

  return <PlatformHome displayName={user.displayName} journey={journey} badges={badges} remaining={remaining} />;
}
