export const GameMode = {
  NORMAL: "NORMAL",
  DAILY: "DAILY",
  FREE_PLAY: "FREE_PLAY",
  EVENT: "EVENT",
} as const;

export type GameMode = typeof GameMode[keyof typeof GameMode];

export const SelectionPolicy = {
  DAILY: "DAILY",
  FREE_PLAY: "FREE_PLAY",
  EVENT: "EVENT",
} as const;

export type SelectionPolicy = typeof SelectionPolicy[keyof typeof SelectionPolicy];

export type ModeCapability = {
  mode: GameMode;
  active: boolean;
  usesGeneratedSelection: boolean;
  supportsUserFilters: boolean;
  sharedSelection: boolean;
  replayable: boolean;
  hasTimeWindow: boolean;
  selectionPolicy: SelectionPolicy | null;
};

const capabilities: Readonly<Record<GameMode, ModeCapability>> = Object.freeze({
  [GameMode.NORMAL]: Object.freeze({
    mode: GameMode.NORMAL,
    active: true,
    usesGeneratedSelection: false,
    supportsUserFilters: false,
    sharedSelection: false,
    replayable: true,
    hasTimeWindow: false,
    selectionPolicy: null,
  }),
  [GameMode.DAILY]: Object.freeze({
    mode: GameMode.DAILY,
    active: true,
    usesGeneratedSelection: true,
    supportsUserFilters: false,
    sharedSelection: true,
    replayable: false,
    hasTimeWindow: true,
    selectionPolicy: SelectionPolicy.DAILY,
  }),
  [GameMode.FREE_PLAY]: Object.freeze({
    mode: GameMode.FREE_PLAY,
    active: true,
    usesGeneratedSelection: true,
    supportsUserFilters: true,
    sharedSelection: false,
    replayable: true,
    hasTimeWindow: false,
    selectionPolicy: SelectionPolicy.FREE_PLAY,
  }),
  [GameMode.EVENT]: Object.freeze({
    mode: GameMode.EVENT,
    active: false,
    usesGeneratedSelection: true,
    supportsUserFilters: false,
    sharedSelection: true,
    replayable: false,
    hasTimeWindow: true,
    selectionPolicy: SelectionPolicy.EVENT,
  }),
});

export function getModeCapability(mode: GameMode) {
  return capabilities[mode] ?? null;
}

export function listModeCapabilities() {
  return Object.values(capabilities);
}
