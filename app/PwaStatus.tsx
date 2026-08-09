"use client";

import { useEffect, useState } from "react";

export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [update, setUpdate] = useState<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const syncConnection = () => setOffline(!navigator.onLine);
    syncConnection();
    addEventListener("online", syncConnection);
    addEventListener("offline", syncConnection);
    if ("serviceWorker" in navigator) navigator.serviceWorker.ready.then(registration => {
      void registration.update();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdate(registration);
        });
      });
    });
    return () => {
      removeEventListener("online", syncConnection);
      removeEventListener("offline", syncConnection);
    };
  }, []);

  function refresh() {
    if (!update?.waiting || updating) return;
    setUpdating(true);
    const reload = () => location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
    update.waiting.postMessage({ type: "SKIP_WAITING" });
    setTimeout(reload, 4_000);
  }

  if (!offline && !update) return null;
  return <aside className={`pwa-status ${offline ? "offline" : "update"}`} role="status" aria-live="polite">
    <span>{offline
      ? "Sem conexão. Jogos e operações que precisam do servidor ficam indisponíveis até a reconexão."
      : "Uma nova versão está pronta."}</span>
    {update && <button onClick={refresh} disabled={updating}>{updating ? "ATUALIZANDO…" : "ATUALIZAR"}</button>}
  </aside>;
}
