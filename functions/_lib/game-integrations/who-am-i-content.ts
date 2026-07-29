import type { WhoAmIChallenge } from "../../../app/games/who-am-i/engine";
import type { WhoAmIContentPayload } from "../../../shared/content";
import { sha256 } from "../security";

export async function whoAmIChallengesFromContent(
  contentId: string,
  payload: WhoAmIContentPayload,
): Promise<WhoAmIChallenge[]> {
  return Promise.all(payload.challenges.map(async (challenge, index) => ({
    id: `challenge-${(await sha256(`${contentId}:${index}:challenge`)).slice(0, 20)}`,
    answer: challenge.answer,
    hints: [...challenge.hints],
  })));
}
