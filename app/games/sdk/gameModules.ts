import { gameCatalog } from "../../data/gameCatalog";
import type { GameModuleContract } from "./types";

export const gameModules: readonly GameModuleContract[] = gameCatalog.map(game => ({
  id: game.id,
  slug: game.slug,
  name: game.name,
  route: game.route,
  availability: game.status,
}));

export function getGameModule(slug: string) {
  return gameModules.find(module => module.slug === slug);
}

