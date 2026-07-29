import { GameType, validateContent, type AssociationContentPayload } from "../../../../shared/content";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { associationRoundFromContent } from "../../../_lib/game-integrations/association-content";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";

async function publishedAssociation(env: AppEnv, organizationId: string, contentId?: string) {
  const content = await findPublishedUniversalContent(env, organizationId, GameType.ASSOCIATION, contentId);
  if (!content) return null;
  const validation = validateContent(content.gameType, {
    id: content.id,
    gameType: content.gameType,
    category: content.category,
    tags: content.tags,
    difficulty: content.difficulty,
    biblicalReference: content.biblicalReference,
    status: content.status,
    authorId: content.authorId,
    reviewerId: content.reviewerId,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    version: content.version,
    internalNotes: content.internalNotes,
  }, content.payload);
  if (!validation.valid) return null;
  const round = await associationRoundFromContent(
    content.id,
    content.payload as AssociationContentPayload,
  );
  return { content, round };
}

function shuffle<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  if (result.length > 1 && result.every((item, index) => item === items[index])) {
    [result[0], result[1]] = [result[1], result[0]];
  }
  return result;
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const published = await publishedAssociation(env, String(user.organizationId));
    if (!published) {
      return json({ error: "association_content_unavailable" }, 404, {
        "cache-control": "no-store, private",
      });
    }
    const { content, round } = published;
    return json({
      content: {
        id: content.id,
        version: content.version,
        title: round.title,
        leftItems: shuffle(round.pairs).map(pair => ({
          id: pair.leftId,
          label: pair.left,
          category: pair.category ?? null,
        })),
        rightItems: shuffle(round.pairs).map(pair => ({
          id: pair.rightId,
          label: pair.right,
        })),
        pairCount: round.pairs.length,
        biblicalReference: content.biblicalReference,
      },
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body: any = await request.json().catch(() => null);
    if (!body || typeof body.contentId !== "string" || !Number.isInteger(body.contentVersion)
      || typeof body.leftId !== "string" || typeof body.rightId !== "string") {
      return json({ error: "invalid_association_attempt" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const published = await publishedAssociation(env, String(user.organizationId), body.contentId);
    if (!published || published.content.version !== body.contentVersion) {
      return json({ error: "invalid_association_content" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const left = published.round.pairs.find(pair => pair.leftId === body.leftId);
    const right = published.round.pairs.find(pair => pair.rightId === body.rightId);
    if (!left || !right) {
      return json({ error: "invalid_association_item" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    return json({
      correct: left.id === right.id,
      matchedPairId: left.id === right.id ? left.id : null,
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
