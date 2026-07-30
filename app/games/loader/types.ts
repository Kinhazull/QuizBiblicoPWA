import type { GameType } from "../../../shared/content";

export const GameContentMode = {
  NORMAL: "NORMAL",
  DAILY: "DAILY",
  FREE_PLAY: "FREE_PLAY",
  EVENT: "EVENT",
} as const;

export type GameContentMode = typeof GameContentMode[keyof typeof GameContentMode];

export type LoadedGameContent<TPayload = unknown> = {
  mode: GameContentMode;
  gameType: GameType;
  selectionId: string | null;
  participationId: string | null;
  contentId: string;
  contentVersion: number;
  payload: TPayload;
  metadata: {
    title: string | null;
    biblicalReference: string | null;
    expiresAt: number | null;
  };
};

export type GameContentRequest = {
  gameType: GameType;
  mode?: GameContentMode;
  selectionId?: string | null;
  signal?: AbortSignal;
};

export interface GameContentProvider {
  readonly mode: GameContentMode;
  load<TPayload>(request: GameContentRequest): Promise<LoadedGameContent<TPayload>>;
}

