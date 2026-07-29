import type { ThreeCluesChallenge } from "../../../app/games/three-clues/engine";
import type { ThreeCluesContentPayload } from "../../../shared/content";
import { sha256 } from "../security";

export async function threeCluesChallengesFromContent(
  contentId: string,
  payload: ThreeCluesContentPayload,
): Promise<ThreeCluesChallenge[]> {
  return Promise.all(payload.challenges.map(async (challenge, index) => ({
    id: `challenge-${(await sha256(`${contentId}:${index}:three-clues`)).slice(0, 20)}`,
    answer: challenge.answer,
    clues: [...challenge.clues] as [string, string, string],
  })));
}
