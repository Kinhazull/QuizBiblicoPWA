"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  exitActiveGame,
  gameReturnDestination,
  useActiveGameNavigation,
} from "./GameNavigationContext";

function explicitDestination(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath === "/jogos" || normalizedPath === "/desafios-diarios") return "/";
  if (normalizedPath === "/eventos") return "/";
  if (normalizedPath.startsWith("/eventos/")) return "/eventos";
  if (
    normalizedPath === "/perfil"
    || normalizedPath === "/recompensas"
    || normalizedPath === "/inventario"
    || normalizedPath === "/loja"
  ) return "/";
  if (normalizedPath.startsWith("/admin/")) return "/admin";
  if (normalizedPath.startsWith("/jogos/") || normalizedPath === "/jogar") return "/jogos";
  return "/";
}

export function BackNavigation() {
  const pathname = usePathname();
  const activeGame = useActiveGameNavigation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const leaving = useRef<Promise<void> | null>(null);
  const allowNavigation = useRef(false);

  const gameDestination = activeGame
    ? gameReturnDestination(activeGame.mode, typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("eventId"))
    : null;
  const destination = gameDestination ?? explicitDestination(pathname);

  useEffect(() => {
    if (!activeGame || activeGame.state !== "active") return;
    const guard = { platformGameExitGuard: true };
    history.pushState(guard, "", location.href);
    const onPopState = () => {
      if (allowNavigation.current) return;
      history.pushState(guard, "", location.href);
      setConfirming(true);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigation.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [activeGame]);

  if (pathname === "/") return null;

  function requestExit() {
    if (activeGame?.state === "active") {
      setError("");
      setConfirming(true);
      return;
    }
    location.assign(destination);
  }

  async function confirmExit() {
    if (!activeGame) {
      location.assign(destination);
      return;
    }
    if (leaving.current) return leaving.current;
    const operation = (async () => {
      setBusy(true);
      setError("");
      try {
        await exitActiveGame(activeGame);
        allowNavigation.current = true;
        location.replace(destination);
      } catch {
        setError("Não foi possível encerrar a partida. Verifique sua conexão e tente novamente.");
        setBusy(false);
      }
    })();
    leaving.current = operation;
    await operation.finally(() => {
      leaving.current = null;
    });
  }

  const daily = activeGame?.mode === "DAILY";
  return <>
    <button
      className="global-back"
      onClick={requestExit}
      aria-label="Voltar para a tela anterior"
    >
      ← Voltar
    </button>
    {confirming ? (
      <div className="modal-layer game-exit-layer" role="presentation">
        <section
          className="game-exit-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-exit-title"
          aria-describedby="game-exit-description"
        >
          <h2 id="game-exit-title">
            {daily ? "Abandonar o desafio diário?" : "Sair da partida?"}
          </h2>
          <p id="game-exit-description">
            {daily
              ? "Esta partida será encerrada como derrota e você não poderá tentar este desafio novamente hoje."
              : "Seu progresso nesta partida será encerrado e ela será registrada como derrota."}
          </p>
          {error ? <p role="alert" className="game-exit-error">{error}</p> : null}
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              autoFocus
            >
              Continuar jogando
            </button>
            <button type="button" disabled={busy} onClick={confirmExit}>
              {busy ? "Encerrando..." : "Sair da partida"}
            </button>
          </div>
        </section>
      </div>
    ) : null}
  </>;
}
