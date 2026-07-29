import { GameType } from "../../shared/content";
import { GameGenerationMode, type GameGenerationMode as Mode } from "./universal-game-generation-contract";

export type GameGenerationCapability = {
  gameType: string;
  minimumContents: number;
  maximumContents: number;
  supportedModes: readonly Mode[];
  supportsDifficulty: boolean;
  adapterVersion: number;
};

const internalFoundationCapability = (gameType: string): GameGenerationCapability => ({
  gameType,
  minimumContents: 1,
  maximumContents: 20,
  supportedModes: [GameGenerationMode.INTERNAL_TEST],
  supportsDifficulty: true,
  adapterVersion: 1,
});

const capabilities = new Map<string, GameGenerationCapability>([
  ...Object.values(GameType)
    .filter(gameType => gameType !== GameType.WORDLE)
    .map(gameType => [gameType, internalFoundationCapability(gameType)] as const),
  [GameType.WORDLE, {
    gameType: GameType.WORDLE,
    minimumContents: 1,
    maximumContents: 1,
    supportedModes: [GameGenerationMode.INTERNAL_TEST],
    supportsDifficulty: true,
    adapterVersion: 1,
  }],
]);

export function getGameGenerationCapability(gameType: string) {
  return capabilities.get(gameType) ?? null;
}

export function registeredGameGenerationCapabilities() {
  return [...capabilities.values()];
}
