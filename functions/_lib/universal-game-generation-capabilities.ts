import { GameType } from "../../shared/content";
import { GameGenerationMode, type GameGenerationMode as Mode } from "./universal-game-generation-contract";

export type GameGenerationCapability = {
  gameType: string;
  minimumContents: number;
  maximumContents: number;
  supportedModes: readonly Mode[];
  supportsDifficulty: boolean;
  supportsThemes: boolean;
  supportsBooks: boolean;
  supportsTestament: boolean;
  allowedCounts: readonly number[];
  adapterVersion: number;
};

const capabilities = new Map<string, GameGenerationCapability>([
  [GameType.WORDLE, {
    gameType: GameType.WORDLE,
    minimumContents: 1,
    maximumContents: 1,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY, GameGenerationMode.FREE_PLAY, GameGenerationMode.EVENT],
    supportsDifficulty: true,
    supportsThemes: true,
    supportsBooks: true,
    supportsTestament: false,
    allowedCounts: [1],
    adapterVersion: 1,
  }],
  [GameType.QUIZ, {
    gameType: GameType.QUIZ,
    minimumContents: 5,
    maximumContents: 20,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY, GameGenerationMode.FREE_PLAY, GameGenerationMode.EVENT],
    supportsDifficulty: true,
    supportsThemes: true,
    supportsBooks: true,
    supportsTestament: false,
    allowedCounts: [5, 10, 20],
    adapterVersion: 1,
  }],
  [GameType.MEMORY, {
    gameType: GameType.MEMORY,
    minimumContents: 3,
    maximumContents: 3,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY, GameGenerationMode.FREE_PLAY, GameGenerationMode.EVENT],
    supportsDifficulty: true,
    supportsThemes: true,
    supportsBooks: true,
    supportsTestament: false,
    allowedCounts: [3],
    adapterVersion: 2,
  }],
  ...[
    GameType.TIMELINE,
    GameType.ASSOCIATION,
    GameType.WHO_AM_I,
    GameType.THREE_CLUES,
  ].map(gameType => [gameType, {
    gameType,
    minimumContents: 1,
    maximumContents: 20,
    supportedModes: [GameGenerationMode.INTERNAL_TEST, GameGenerationMode.DAILY, GameGenerationMode.FREE_PLAY, GameGenerationMode.EVENT],
    supportsDifficulty: true,
    supportsThemes: true,
    supportsBooks: true,
    supportsTestament: false,
    allowedCounts: [1],
    adapterVersion: 1,
  }] as const),
]);

export function getGameGenerationCapability(gameType: string) {
  return capabilities.get(gameType) ?? null;
}

export function registeredGameGenerationCapabilities() {
  return [...capabilities.values()];
}
