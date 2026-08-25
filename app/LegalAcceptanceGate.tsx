"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

const LEGAL_VERSION = "2026-08-24";

export function LegalAcceptanceGate() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isPublicLegalDocument = typeof window !== "undefined"
    && (window.location.pathname === "/termos" || window.location.pathname.startsWith("/privacidade"));
  if (isPublicLegalDocument || !user?.legalAcceptanceRequired || user.mustChangePassword || user.mfaEnrollmentRequired) return null;

  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("adultConfirmed") !== "on") { setMessage("Confirme que você tem 18 anos ou mais para continuar."); return; }
    if (data.get("legalAccepted") !== "on") { setMessage("Aceite os Termos de Uso e a Política de Privacidade para continuar."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/legal-acceptance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ adultConfirmed: true, legalAccepted: true, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error === "adult_confirmation_required" ? "Confirme que você tem 18 anos ou mais para continuar." : "Não foi possível registrar sua confirmação. Tente novamente."); return; }
      await refreshUser();
    } catch { setMessage("Sem conexão. Tente novamente."); }
    finally { setBusy(false); }
  }

  return <div className="legal-gate" role="dialog" aria-modal="true" aria-labelledby="legal-gate-title"><section>
    <p className="eyebrow">ATUALIZAÇÃO JURÍDICA</p><h1 id="legal-gate-title">Confirme para continuar</h1>
    <p>Atualizamos nossos documentos. O Conte os Feitos é destinado exclusivamente a pessoas com 18 anos ou mais.</p>
    <form onSubmit={accept} noValidate>
      <label className="legal-consent"><input name="adultConfirmed" type="checkbox"/><span>Declaro que tenho 18 anos ou mais.</span></label>
      <label className="legal-consent"><input name="legalAccepted" type="checkbox"/><span>Li e aceito os <a href="/termos" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.</span></label>
      {message && <p className="auth-message" role="alert" aria-live="assertive">{message}</p>}
      <button className="primary" disabled={busy}>{busy ? "REGISTRANDO..." : "CONFIRMAR E CONTINUAR"}</button>
    </form>
  </section></div>;
}
