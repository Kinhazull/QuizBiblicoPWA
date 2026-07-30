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

const capabilities = new Map<string, GameGenerationCapability>([
  [GameType.WORDLE, {
    gameType: GameType.WORDLE,
    minimumContents: 1,
    maximumContents: 1,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY],
    supportsDifficulty: true,
    adapterVersion: 1,
  }],
  [GameType.QUIZ, {
    gameType: GameType.QUIZ,
    minimumContents: 5,
    maximumContents: 5,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY],
    supportsDifficulty: true,
    adapterVersion: 1,
  }],
  ...[
    GameType.TIMELINE,
    GameType.MEMORY,
    GameType.ASSOCIATION,
    GameType.WHO_AM_I,
    GameType.THREE_CLUES,
  ].map(gameType => [gameType, {
    gameType,
    minimumContents: 1,
    maximumContents: 20,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY],
    supportsDifficulty: true,
    adapterVersion: 1,
  }] as const),
]);

export function getGameGenerationCapability(gameType: string) {
  return capabilities.get(gameType) ?? null;
}

export function registeredGameGenerationCapabilities() {
  return [...capabilities.values()];
}
