import { GameType, validateContent, type ThreeCluesContentPayload } from "../../../../shared/content";
import { normalizeThreeCluesAnswer } from "../../../../app/games/three-clues/engine";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { threeCluesChallengesFromContent } from "../../../_lib/game-integrations/three-clues-content";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";

async function publishedThreeClues(env: AppEnv, organizationId: string, contentId?: string) {
  const content = await findPublishedUniversalContent(env, organizationId, GameType.THREE_CLUES, contentId);
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
  const challenges = await threeCluesChallengesFromContent(
    content.id,
    content.payload as ThreeCluesContentPayload,
  );
  return { content, challenges };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const published = await publishedThreeClues(env, String(user.organizationId));
    if (!published) {
      return json({ error: "three_clues_content_unavailable" }, 404, {
        "cache-control": "no-store, private",
      });
    }
    return json({
      content: {
        id: published.content.id,
        version: published.content.version,
        title: (published.content.payload as ThreeCluesContentPayload).title,
        challenges: published.challenges.map(challenge => ({
          id: challenge.id,
          clues: challenge.clues,
        })),
        biblicalReference: published.content.biblicalReference,
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
      || typeof body.challengeId !== "string" || typeof body.answer !== "string"
      || !normalizeThreeCluesAnswer(body.answer) || body.answer.length > 100) {
      return json({ error: "invalid_three_clues_answer" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const published = await publishedThreeClues(env, String(user.organizationId), body.contentId);
    if (!published || published.content.version !== body.contentVersion) {
      return json({ error: "invalid_three_clues_content" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const challenge = published.challenges.find(item => item.id === body.challengeId);
    if (!challenge) {
      return json({ error: "invalid_three_clues_challenge" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    return json({
      correct: normalizeThreeCluesAnswer(body.answer) === normalizeThreeCluesAnswer(challenge.answer),
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
