import type { GameType } from "../../../shared/content";
import { GameMode } from "../../../shared/game-modes";

export const GameContentMode = GameMode;
export type GameContentMode = GameMode;

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
  eventId?: string | null;
  signal?: AbortSignal;
};

export interface GameContentProvider {
  readonly mode: GameContentMode;
  load<TPayload>(request: GameContentRequest): Promise<LoadedGameContent<TPayload>>;
}
