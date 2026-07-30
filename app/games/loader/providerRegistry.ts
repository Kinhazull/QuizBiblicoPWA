import type { GameContentMode, GameContentProvider } from "./types";

export class GameContentProviderRegistry {
  readonly #providers = new Map<GameContentMode, GameContentProvider>();

  register(provider: GameContentProvider) {
    if (this.#providers.has(provider.mode)) {
      throw new Error(`game_content_provider_duplicate:${provider.mode}`);
    }
    this.#providers.set(provider.mode, provider);
    return this;
  }

  resolve(mode: GameContentMode) {
    const provider = this.#providers.get(mode);
    if (!provider) throw new Error(`game_content_provider_unavailable:${mode}`);
    return provider;
  }

  modes() {
    return [...this.#providers.keys()];
  }
}
