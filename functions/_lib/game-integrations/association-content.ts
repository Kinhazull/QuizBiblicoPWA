import type { ThemeAssociationRound } from "../../../app/games/theme-association/engine";
import type { AssociationContentPayload } from "../../../shared/content";
import { sha256 } from "../security";

export async function associationRoundFromContent(
  contentId: string,
  payload: AssociationContentPayload,
): Promise<ThemeAssociationRound> {
  const pairs = await Promise.all(payload.pairs.map(async (pair, index) => {
    const identity = `${contentId}:${index}:${pair.left}:${pair.right}`;
    return {
      id: `pair-${(await sha256(identity)).slice(0, 20)}`,
      leftId: `left-${(await sha256(`${identity}:left`)).slice(0, 20)}`,
      rightId: `right-${(await sha256(`${identity}:right`)).slice(0, 20)}`,
      category: pair.category,
      left: pair.left,
      right: pair.right,
    };
  }));
  return { id: contentId, title: payload.title, pairs };
}
