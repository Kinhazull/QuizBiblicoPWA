import type { ReactNode } from "react";

export type GamePlayStatus = "playing" | "won" | "lost";

export type GameModuleContract = {
  id: string;
  slug: string;
  name: string;
  route: string;
  availability: "available" | "development";
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

