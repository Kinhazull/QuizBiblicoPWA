import { requireUser, type AppEnv } from "../../_lib/auth";
import { getPlatformRanking, parseRankingRequest } from "../../_lib/platform-rankings";
import { json } from "../../_lib/security";

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const rankingRequest = parseRankingRequest(new URL(request.url));
    return json(await getPlatformRanking(env, {
      userId: String(user.id), organizationId: String(user.organizationId),
    }, rankingRequest), 200, { "cache-control": "no-store, private" });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof Error && error.message.startsWith("invalid_ranking_")) {
      return json({ error: error.message }, 400, { "cache-control": "no-store, private" });
    }
    throw error;
  }
};
