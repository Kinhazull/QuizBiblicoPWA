import type { ReactNode } from "react";

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
  onRestart: () => void;
  children: ReactNode;
};
