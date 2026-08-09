"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PlatformHome, type DailyChallengeData, type DailyRetentionData, type PlatformAchievementData, type PlatformEventSummary, type PlatformProgressData } from "./PlatformHome";
import type { EquipmentView } from "./EquippedAvatar";

const LEGAL_VERSION = "2026-07-13";

export default function Home() {
  const { user, loading: authLoading, setAuthenticatedUser } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [achievementData, setAchievementData] = useState<PlatformAchievementData | null>(null);
  const [progress, setProgress] = useState<PlatformProgressData | null>(null);
  const [daily, setDaily] = useState<DailyRetentionData | null>(null);
  const [dailyObjectives, setDailyObjectives] = useState<DailyChallengeData | null>(null);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyError, setDailyError] = useState("");
  const [equipment, setEquipment] = useState<EquipmentView | null>(null);
  const [events, setEvents] = useState<PlatformEventSummary[]>([]);

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
    let active = true;
    const controller = new AbortController();
    setProgress(null);
    setDaily(null);
    setDailyObjectives(null);
    setDailyError("");
    fetch("/api/platform/achievements", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data) setAchievementData(data); }).catch(() => undefined);
    fetch("/api/platform/daily-objectives", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && Array.isArray(data?.objectives)) setDailyObjectives(data); })
      .catch(() => undefined);
    fetch("/api/platform/events", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && Array.isArray(data?.events)) setEvents(data.events); })
      .catch(() => undefined);
    void (async () => {
      try {
        const response = await fetch("/api/platform/daily/check-in", {
          method: "POST", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("daily_check_in_failed");
        const data = await response.json();
        if (!data?.daily) throw new Error("daily_state_unavailable");
        if (!active) return;
        setDaily(data.daily);
        setProgress(data.daily.progress || null);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setDailyError("Não foi possível carregar o ciclo diário. Tente recarregar a página.");
        try {
          const progressResponse = await fetch("/api/platform/progress", { cache: "no-store", signal: controller.signal });
          const progressData = progressResponse.ok ? await progressResponse.json() : null;
          if (!active) return;
          if (progressData?.progress) setProgress(progressData.progress);
        } catch {
          // The visible daily error remains the safe fallback when the network is unavailable.
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEquipment(null);
      return;
    }
    let active = true;
    const loadEquipment = () => {
      fetch("/api/platform/inventory", { cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (active && data) setEquipment(data); })
        .catch(() => undefined);
    };
    loadEquipment();
    window.addEventListener("focus", loadEquipment);
    window.addEventListener("platform-equipment-changed", loadEquipment);
    return () => {
      active = false;
      window.removeEventListener("focus", loadEquipment);
      window.removeEventListener("platform-equipment-changed", loadEquipment);
    };
  }, [user]);

  async function openDailyChest() {
    if (dailyBusy || !daily?.chest.unlocked || daily.chest.opened) return;
    setDailyBusy(true);
    setDailyError("");
    try {
      const response = await fetch("/api/platform/daily/chest", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setDailyError(data.error === "daily_chest_locked" ? "Conclua a missão diária para liberar o cofre." : "Não foi possível abrir o cofre.");
        return;
      }
      setDaily(data.daily);
      setProgress(data.daily.progress || null);
    } catch {
      setDailyError("Sem conexão. Tente novamente.");
    } finally {
      setDailyBusy(false);
    }
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

  if (authLoading) return <main className="platform-loading-screen"><div><span aria-hidden="true">C</span><strong>Conte os Feitos</strong><p role="status">Preparando a plataforma…</p></div></main>;

  if (!user) return <main className="shell auth-screen"><div className="ambient one"/><div className="ambient two"/><section className="auth-card"><header className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</header><p className="eyebrow">JOGOS BÍBLICOS</p><h1>{authMode === "login" ? <>Que bom ter você<br/><em>de volta</em></> : <>Entre para a<br/><em>plataforma</em></>}</h1><p className="intro">{authMode === "login" ? "Acesse sua conta para jogar, aprender e acompanhar seu progresso." : "Use o código do seu grupo. Seu cadastro será analisado por um líder."}</p><form onSubmit={submitAuth}>{authMode === "register" && <label>Seu nome<input name="displayName" autoComplete="name" required minLength={3} placeholder="Nome e sobrenome"/></label>}{authMode === "register" && <label>Código do grupo<input name="inviteCode" autoCapitalize="characters" required placeholder="Ex.: FAROL-2026" defaultValue={new URLSearchParams(location.search).get("convite") || ""}/></label>}<label>Nome de usuário<input name="username" autoCapitalize="none" autoComplete="username" required minLength={3} placeholder="Como você vai entrar"/></label><label>Senha<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={10} placeholder="Mínimo de 10 caracteres"/></label>{authMode === "login" && <label className="remember"><input name="persistent" type="checkbox"/> Permanecer conectado neste aparelho</label>}{authMode === "register" && <label className="legal-consent"><input name="legalAccepted" type="checkbox" required/><span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label>}{authError && <p className="auth-message" role="status" aria-live="polite">{authError}</p>}<button className="primary" disabled={authBusy}>{authBusy ? "AGUARDE..." : authMode === "login" ? "ENTRAR" : "CRIAR MINHA CONTA"}<span>→</span></button></form><button className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button><nav className="legal-links" aria-label="Documentos legais"><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></nav></section></main>;

  return <PlatformHome displayName={user.displayName} achievementData={achievementData}
    progress={progress} daily={daily} dailyBusy={dailyBusy}
    dailyObjectives={dailyObjectives} dailyError={dailyError} equipment={equipment} events={events}
    onOpenChest={openDailyChest} />;
}
