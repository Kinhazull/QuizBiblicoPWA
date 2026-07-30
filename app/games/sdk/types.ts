import type { ReactNode } from "react";
import type { GameType } from "../../../shared/content";
import type { GameMode } from "../../../shared/game-modes";

export type GamePlayStatus = "playing" | "won" | "lost";
export type GameModuleStatus = "available" | "development";

export type GameModuleContract = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  objective: string;
  mechanics: readonly string[];
  status: GameModuleStatus;
  primaryButton: "Jogar" | "Ver detalhes";
  route: string;
  image: string;
};

export type GameLayoutProps = {
  eyebrow: string;
  title: string;
  highlightedTitle?: string;
  description: string;
  status: GamePlayStatus;
  currentAttempt: number;
  maxAttempts: number;
  progressLabel?: string;
  gameType: GameType;
  mode?: GameMode;
  onRestart: () => void;
  children: ReactNode;
};
