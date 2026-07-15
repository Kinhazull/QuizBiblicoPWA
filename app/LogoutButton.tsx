"use client";
import { useState } from "react";
import { BrandIcon } from "./navigation";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("logout_failed");
      navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_STATE" });
      sessionStorage.clear();
      location.replace("/");
    } catch {
      setBusy(false);
      setError("Não foi possível sair agora. Verifique sua conexão e tente novamente.");
    }
  }
  return <div className={`logout-control ${className}`}><button type="button" className="logout-button" onClick={logout} disabled={busy} aria-busy={busy}><BrandIcon name="logout" /> {busy ? "Saindo..." : "Sair da conta"}</button>{error && <p className="account-error" role="alert">{error}</p>}</div>;
}
