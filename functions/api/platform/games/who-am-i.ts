import { GameType, validateContent, type WhoAmIContentPayload } from "../../../../shared/content";
import { normalizeWhoAmIAnswer } from "../../../../app/games/who-am-i/engine";
import { requireUser, type AppEnv } from "../../../_lib/auth";
import { whoAmIChallengesFromContent } from "../../../_lib/game-integrations/who-am-i-content";
import { json } from "../../../_lib/security";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";

async function publishedWhoAmI(env: AppEnv, organizationId: string, contentId?: string) {
  const content = await findPublishedUniversalContent(env, organizationId, GameType.WHO_AM_I, contentId);
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
  const challenges = await whoAmIChallengesFromContent(
    content.id,
    content.payload as WhoAmIContentPayload,
  );
  return { content, challenges };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const published = await publishedWhoAmI(env, String(user.organizationId));
    if (!published) {
      return json({ error: "who_am_i_content_unavailable" }, 404, {
        "cache-control": "no-store, private",
      });
    }
    return json({
      content: {
        id: published.content.id,
        version: published.content.version,
        title: (published.content.payload as WhoAmIContentPayload).title,
        challenges: published.challenges.map(challenge => ({
          id: challenge.id,
          hints: challenge.hints,
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
      || !normalizeWhoAmIAnswer(body.answer) || body.answer.length > 100) {
      return json({ error: "invalid_who_am_i_answer" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const published = await publishedWhoAmI(env, String(user.organizationId), body.contentId);
    if (!published || published.content.version !== body.contentVersion) {
      return json({ error: "invalid_who_am_i_content" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    const challenge = published.challenges.find(item => item.id === body.challengeId);
    if (!challenge) {
      return json({ error: "invalid_who_am_i_challenge" }, 400, {
        "cache-control": "no-store, private",
      });
    }
    return json({
      correct: normalizeWhoAmIAnswer(body.answer) === normalizeWhoAmIAnswer(challenge.answer),
    }, 200, { "cache-control": "no-store, private" });
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
};
