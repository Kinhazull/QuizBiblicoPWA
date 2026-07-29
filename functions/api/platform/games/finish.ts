import { requireUser, type AppEnv } from "../../../_lib/auth";
import { adaptPlatformGameCompletion, type PlatformGameCompletion } from "../../../_lib/game-integrations/platform-game-completion";
import { publishOfficialCoreEvent } from "../../../_lib/platform-event-runtime";
import { json } from "../../../_lib/security";
import {
  GameType,
  validateContent,
  type AssociationContentPayload,
  type MemoryContentPayload,
  type TimelineContentPayload,
  type WordleContentPayload,
} from "../../../../shared/content";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";
import { isValidGuess } from "../../../../app/games/wordle/engine";
import type { TimelineRound } from "../../../../app/games/timeline/engine";
import { timelineRoundFromContent } from "../../../_lib/game-integrations/timeline-content";
import { memorySetFromContent } from "../../../_lib/game-integrations/memory-content";
import type { MemorySet } from "../../../../app/games/memory/engine";
import type { ThemeAssociationRound } from "../../../../app/games/theme-association/engine";
import { associationRoundFromContent } from "../../../_lib/game-integrations/association-content";

const SAFE_ERROR = /^[a-z0-9_]{1,100}$/;

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as PlatformGameCompletion | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_game_completion" }, 400);
    }
    const wordleContent = body.gameId === "wordle-biblico"
      ? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.WORDLE,
        body.contentId,
      )
      : null;
    const wordleAnswer = wordleContent
      ? String((wordleContent.payload as WordleContentPayload).word)
      : "";
    if (body.gameId === "wordle-biblico" && !isValidGuess(wordleAnswer)) {
      throw new Error("invalid_wordle_content");
    }
    const timelineContent = body.gameId === "linha-do-tempo-biblica"
      ? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.TIMELINE,
        body.contentId,
      )
      : null;
    let timelineRound: TimelineRound | undefined;
    if (timelineContent) {
      const validation = validateContent(timelineContent.gameType, {
        id: timelineContent.id,
        gameType: timelineContent.gameType,
        category: timelineContent.category,
        tags: timelineContent.tags,
        difficulty: timelineContent.difficulty,
        biblicalReference: timelineContent.biblicalReference,
        status: timelineContent.status,
        authorId: timelineContent.authorId,
        reviewerId: timelineContent.reviewerId,
        createdAt: timelineContent.createdAt,
        updatedAt: timelineContent.updatedAt,
        version: timelineContent.version,
        internalNotes: timelineContent.internalNotes,
      }, timelineContent.payload);
      if (!validation.valid) throw new Error("invalid_timeline_content");
      timelineRound = await timelineRoundFromContent(
        timelineContent.id,
        timelineContent.payload as TimelineContentPayload,
      );
    }
    const memoryContent = body.gameId === "memoria-biblica"
      ? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.MEMORY,
        body.contentId,
      )
      : null;
    let memorySet: MemorySet | undefined;
    if (memoryContent) {
      const validation = validateContent(memoryContent.gameType, {
        id: memoryContent.id,
        gameType: memoryContent.gameType,
        category: memoryContent.category,
        tags: memoryContent.tags,
        difficulty: memoryContent.difficulty,
        biblicalReference: memoryContent.biblicalReference,
        status: memoryContent.status,
        authorId: memoryContent.authorId,
        reviewerId: memoryContent.reviewerId,
        createdAt: memoryContent.createdAt,
        updatedAt: memoryContent.updatedAt,
        version: memoryContent.version,
        internalNotes: memoryContent.internalNotes,
      }, memoryContent.payload);
      if (!validation.valid) throw new Error("invalid_memory_content");
      memorySet = await memorySetFromContent(
        memoryContent.id,
        memoryContent.payload as MemoryContentPayload,
      );
    }
    const associationContent = body.gameId === "associacao-de-temas"
      ? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.ASSOCIATION,
        body.contentId,
      )
      : null;
    let associationRound: ThemeAssociationRound | undefined;
    if (associationContent) {
      const validation = validateContent(associationContent.gameType, {
        id: associationContent.id,
        gameType: associationContent.gameType,
        category: associationContent.category,
        tags: associationContent.tags,
        difficulty: associationContent.difficulty,
        biblicalReference: associationContent.biblicalReference,
        status: associationContent.status,
        authorId: associationContent.authorId,
        reviewerId: associationContent.reviewerId,
        createdAt: associationContent.createdAt,
        updatedAt: associationContent.updatedAt,
        version: associationContent.version,
        internalNotes: associationContent.internalNotes,
      }, associationContent.payload);
      if (!validation.valid) throw new Error("invalid_association_content");
      associationRound = await associationRoundFromContent(
        associationContent.id,
        associationContent.payload as AssociationContentPayload,
      );
    }
    const event = adaptPlatformGameCompletion(body, {
      userId: user.id,
      organizationId: user.organizationId,
      completedAt: Date.now(),
      wordleContent: wordleContent ? {
        id: wordleContent.id,
        version: wordleContent.version,
        answer: wordleAnswer,
      } : undefined,
      timelineContent: timelineContent && timelineRound ? {
        id: timelineContent.id,
        version: timelineContent.version,
        round: timelineRound,
      } : undefined,
      memoryContent: memoryContent && memorySet ? {
        id: memoryContent.id,
        version: memoryContent.version,
        set: memorySet,
      } : undefined,
      associationContent: associationContent && associationRound ? {
        id: associationContent.id,
        version: associationContent.version,
        round: associationRound,
      } : undefined,
    });
    const result = await publishOfficialCoreEvent(env, event, event.occurredAt);
    return json({
      ok: true,
      eventId: event.eventId,
      outcome: event.payload.correctAnswers > 0 ? "won" : "lost",
      score: event.payload.score,
      processing: result.status,
      duplicate: result.duplicate,
    }, result.status === "completed" ? 200 : 202, {
      "cache-control": "no-store, private",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const code = error instanceof Error && SAFE_ERROR.test(error.message)
      ? error.message
      : "game_completion_failed";
    const status = code.startsWith("invalid_") || code.startsWith("incomplete_") || code.startsWith("unsupported_")
      ? 400
      : 500;
    return json({ error: code }, status, { "cache-control": "no-store, private" });
  }
};
