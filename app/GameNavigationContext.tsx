"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GameType } from "../shared/content";
import { GameMode } from "../shared/game-modes";

export type ActiveGameNavigation = {
  gameType: GameType;
  mode: GameMode;
  selectionId: string;
  state: "active" | "finished";
};

type GameNavigationContextValue = {
  activeGame: ActiveGameNavigation | null;
  registerActiveGame: (game: ActiveGameNavigation | null) => void;
};

const GameNavigationContext = createContext<GameNavigationContextValue | null>(null);

export function GameNavigationProvider({ children }: { children: ReactNode }) {
  const [activeGame, setActiveGame] = useState<ActiveGameNavigation | null>(null);
  const registerActiveGame = useCallback((game: ActiveGameNavigation | null) => {
    setActiveGame(game);
  }, []);
  const value = useMemo(
    () => ({ activeGame, registerActiveGame }),
    [activeGame, registerActiveGame],
  );
  return (
    <GameNavigationContext.Provider value={value}>
      {children}
    </GameNavigationContext.Provider>
  );
}

export function useActiveGameNavigation() {
  const context = useContext(GameNavigationContext);
  if (!context) throw new Error("game_navigation_provider_missing");
  return context.activeGame;
}

export function useRegisterActiveGame(
  gameType: GameType,
  mode: GameMode | undefined,
  state: "idle" | "active" | "finished",
) {
  const context = useContext(GameNavigationContext);
  if (!context) throw new Error("game_navigation_provider_missing");
  const { registerActiveGame } = context;

  useEffect(() => {
    if (state === "idle") {
      registerActiveGame(null);
      return;
    }
    const parameters = new URLSearchParams(window.location.search);
    const resolvedMode = mode ?? GameMode.NORMAL;
    const selectionId = resolvedMode === GameMode.DAILY
      ? parameters.get("daily")
      : resolvedMode === GameMode.FREE_PLAY
        ? parameters.get("freePlay")
        : resolvedMode === GameMode.EVENT
          ? parameters.get("event")
          : null;
    if (!selectionId) {
      registerActiveGame(null);
      return;
    }
    registerActiveGame({ gameType, mode: resolvedMode, selectionId, state });
    return () => registerActiveGame(null);
  }, [gameType, mode, registerActiveGame, state]);
}

export function gameReturnDestination(mode: GameMode, eventId?: string | null) {
  if (mode === GameMode.DAILY) return "/desafios-diarios";
  if (mode === GameMode.EVENT) {
    return eventId ? `/eventos/${encodeURIComponent(eventId)}` : "/eventos";
  }
  return "/jogos";
}

export async function exitActiveGame(game: ActiveGameNavigation) {
  const response = await fetch("/api/platform/games/abandon", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gameType: game.gameType,
      mode: game.mode,
      selectionId: game.selectionId,
    }),
  });
  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || "game_abandon_failed");
  return data;
}
