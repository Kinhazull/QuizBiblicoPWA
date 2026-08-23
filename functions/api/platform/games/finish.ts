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
  type ThreeCluesContentPayload,
  type WhoAmIContentPayload,
  type WordleContentPayload,
} from "../../../../shared/content";
import { findPublishedUniversalContent } from "../../../_lib/universal-content-store";
import { isSupportedWordLength, isValidGuess, normalizeWord } from "../../../../app/games/wordle/engine";
import type { TimelineRound } from "../../../../app/games/timeline/engine";
import { timelineRoundFromContent } from "../../../_lib/game-integrations/timeline-content";
import { memorySetFromContent, memorySetFromSelection } from "../../../_lib/game-integrations/memory-content";
import type { MemorySet } from "../../../../app/games/memory/engine";
import type { ThemeAssociationRound } from "../../../../app/games/theme-association/engine";
import { associationRoundFromContent } from "../../../_lib/game-integrations/association-content";
import type { WhoAmIChallenge } from "../../../../app/games/who-am-i/engine";
import { whoAmIChallengesFromContent } from "../../../_lib/game-integrations/who-am-i-content";
import type { ThreeCluesChallenge } from "../../../../app/games/three-clues/engine";
import { threeCluesChallengesFromContent } from "../../../_lib/game-integrations/three-clues-content";
import {
  generatedMemoryCards,
  dailySelectionContext,
  finishDailyParticipation,
} from "../../../_lib/platform-daily-objectives";
import {
  finishFreePlayParticipation,
  freePlaySelectionContext,
} from "../../../_lib/platform-free-play";
import { eventSelectionContext, finishEventParticipation } from "../../../_lib/platform-events";

const SAFE_ERROR = /^[a-z0-9_]{1,100}$/;

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const body = await request.json().catch(() => null) as PlatformGameCompletion | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "invalid_game_completion" }, 400);
    }
    if ([body.dailySelectionId, body.freePlaySelectionId, body.eventSelectionId].filter(Boolean).length > 1) {
      throw new Error("invalid_game_selection_mode");
    }
    const daily = body.dailySelectionId
      ? await dailySelectionContext(env, {
        organizationId: String(user.organizationId),
        userId: String(user.id),
      }, body.dailySelectionId, body.gameId, Date.now(), true)
      : null;
    const freePlay = body.freePlaySelectionId
      ? await freePlaySelectionContext(env, {
        organizationId: String(user.organizationId),
        userId: String(user.id),
      }, body.freePlaySelectionId, body.gameId, Date.now(), true)
      : null;
    const eventRow = body.eventSelectionId
      ? await env.DB.prepare(`SELECT event_id eventId FROM platform_event_games
        WHERE selection_id=?1 AND organization_id=?2 AND game_type=?3`)
        .bind(body.eventSelectionId, String(user.organizationId), body.gameId).first<{ eventId: string }>()
      : null;
    const eventContext = body.eventSelectionId && eventRow
      ? await eventSelectionContext(env, {
        organizationId: String(user.organizationId), userId: String(user.id),
      }, eventRow.eventId, body.eventSelectionId, body.gameId, Date.now(), true)
      : null;
    if (body.eventSelectionId && !eventContext) throw new Error("invalid_event_selection");
    const generated = daily ?? freePlay ?? eventContext;
    const generatedContent = generated?.contents.length === 1 ? generated.contents[0] : null;
    const resolvedGeneratedContent = generatedContent ? {
      id: generatedContent.id,
      version: generatedContent.version,
      gameType: body.gameId,
      category: String(generatedContent.metadata.category ?? ""),
      tags: Array.isArray(generatedContent.metadata.tags) ? generatedContent.metadata.tags as string[] : [],
      difficulty: generatedContent.metadata.difficulty,
      biblicalReference: typeof generatedContent.metadata.biblicalReference === "string" ? generatedContent.metadata.biblicalReference : null,
      status: generatedContent.metadata.status,
      authorId: String(generatedContent.metadata.authorId ?? ""),
      reviewerId: typeof generatedContent.metadata.reviewerId === "string" ? generatedContent.metadata.reviewerId : null,
      createdAt: Number(generatedContent.metadata.createdAt ?? 0),
      updatedAt: Number(generatedContent.metadata.updatedAt ?? 0),
      internalNotes: typeof generatedContent.metadata.internalNotes === "string" ? generatedContent.metadata.internalNotes : null,
      payload: generatedContent.payload,
    } as any : null;
    const wordleContent = body.gameId === "wordle-biblico"
      ? resolvedGeneratedContent ?? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.WORDLE,
        body.contentId,
      )
      : null;
    const wordleAnswer = wordleContent
      ? String((wordleContent.payload as WordleContentPayload).word)
      : "";
    const wordleLength = normalizeWord(wordleAnswer).length;
    if (body.gameId === "wordle-biblico"
      && (!isSupportedWordLength(wordleLength) || !isValidGuess(wordleAnswer, wordleLength))) {
      throw new Error("invalid_wordle_content");
    }
    const timelineContent = body.gameId === "linha-do-tempo-biblica"
      ? resolvedGeneratedContent ?? await findPublishedUniversalContent(
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
    const historicalMemoryContent = body.gameId === "memoria-biblica" && generated?.contents[0]
      ? {
        id: generated.contents[0].id,
        version: generated.contents[0].version,
        gameType: GameType.MEMORY,
        category: String(generated.contents[0].metadata.category ?? ""),
        tags: Array.isArray(generated.contents[0].metadata.tags) ? generated.contents[0].metadata.tags as string[] : [],
        difficulty: generated.contents[0].metadata.difficulty,
        biblicalReference: typeof generated.contents[0].metadata.biblicalReference === "string" ? generated.contents[0].metadata.biblicalReference : null,
        status: generated.contents[0].metadata.status,
        authorId: String(generated.contents[0].metadata.authorId ?? ""),
        reviewerId: typeof generated.contents[0].metadata.reviewerId === "string" ? generated.contents[0].metadata.reviewerId : null,
        createdAt: Number(generated.contents[0].metadata.createdAt ?? 0),
        updatedAt: Number(generated.contents[0].metadata.updatedAt ?? 0),
        internalNotes: typeof generated.contents[0].metadata.internalNotes === "string" ? generated.contents[0].metadata.internalNotes : null,
        payload: generated.contents[0].payload,
      } as any
      : null;
    const memoryContent = body.gameId === "memoria-biblica"
      ? historicalMemoryContent ?? await findPublishedUniversalContent(
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
      memorySet = generated
        ? await memorySetFromSelection(
          generated.selection.id,
          generated.selection.seedHash,
          generated.contents.map(content => ({
            id: content.id,
            version: content.version,
            payload: content.payload as MemoryContentPayload,
          })),
        )
        : await memorySetFromContent(
          memoryContent.id,
          memoryContent.payload as MemoryContentPayload,
        );
    }
    const associationContent = body.gameId === "associacao-de-temas"
      ? resolvedGeneratedContent ?? await findPublishedUniversalContent(
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
    const whoAmIContent = body.gameId === "quem-sou-eu"
      ? resolvedGeneratedContent ?? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.WHO_AM_I,
        body.contentId,
      )
      : null;
    let whoAmIChallenges: WhoAmIChallenge[] | undefined;
    if (whoAmIContent) {
      const validation = validateContent(whoAmIContent.gameType, {
        id: whoAmIContent.id,
        gameType: whoAmIContent.gameType,
        category: whoAmIContent.category,
        tags: whoAmIContent.tags,
        difficulty: whoAmIContent.difficulty,
        biblicalReference: whoAmIContent.biblicalReference,
        status: whoAmIContent.status,
        authorId: whoAmIContent.authorId,
        reviewerId: whoAmIContent.reviewerId,
        createdAt: whoAmIContent.createdAt,
        updatedAt: whoAmIContent.updatedAt,
        version: whoAmIContent.version,
        internalNotes: whoAmIContent.internalNotes,
      }, whoAmIContent.payload);
      if (!validation.valid) throw new Error("invalid_who_am_i_content");
      whoAmIChallenges = await whoAmIChallengesFromContent(
        whoAmIContent.id,
        whoAmIContent.payload as WhoAmIContentPayload,
      );
    }
    const threeCluesContent = body.gameId === "jogo-tres-pistas"
      ? resolvedGeneratedContent ?? await findPublishedUniversalContent(
        env,
        String(user.organizationId),
        GameType.THREE_CLUES,
        body.contentId,
      )
      : null;
    let threeCluesChallenges: ThreeCluesChallenge[] | undefined;
    if (threeCluesContent) {
      const validation = validateContent(threeCluesContent.gameType, {
        id: threeCluesContent.id,
        gameType: threeCluesContent.gameType,
        category: threeCluesContent.category,
        tags: threeCluesContent.tags,
        difficulty: threeCluesContent.difficulty,
        biblicalReference: threeCluesContent.biblicalReference,
        status: threeCluesContent.status,
        authorId: threeCluesContent.authorId,
        reviewerId: threeCluesContent.reviewerId,
        createdAt: threeCluesContent.createdAt,
        updatedAt: threeCluesContent.updatedAt,
        version: threeCluesContent.version,
        internalNotes: threeCluesContent.internalNotes,
      }, threeCluesContent.payload);
      if (!validation.valid) throw new Error("invalid_three_clues_content");
      threeCluesChallenges = await threeCluesChallengesFromContent(
        threeCluesContent.id,
        threeCluesContent.payload as ThreeCluesContentPayload,
      );
    }
    let completionBody = body;
    if (
      generated
      && body.gameId === GameType.MEMORY
      && memoryContent
      && Array.isArray(body.revealedCardIds)
    ) {
      const { cards } = await generatedMemoryCards(
        generated.selection.seedHash,
        generated.selection.id,
        generated.contents.map(content => ({
          id: content.id,
          version: content.version,
          payload: content.payload as MemoryContentPayload,
        })),
      );
      const actualIds = new Map(cards.map(card => [card.id, `${card.pairId}:${card.side}`]));
      completionBody = {
        ...body,
        revealedCardIds: body.revealedCardIds.map(id => actualIds.get(id) ?? ""),
      };
    }
    const completionContext = {
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
      whoAmIContent: whoAmIContent && whoAmIChallenges ? {
        id: whoAmIContent.id,
        version: whoAmIContent.version,
        challenges: whoAmIChallenges,
      } : undefined,
      threeCluesContent: threeCluesContent && threeCluesChallenges ? {
        id: threeCluesContent.id,
        version: threeCluesContent.version,
        challenges: threeCluesChallenges,
      } : undefined,
    };
    let event = adaptPlatformGameCompletion(completionBody, completionContext);
    const existingEvent = await env.DB.prepare(`SELECT occurred_at occurredAt
      FROM core_platform_events
      WHERE event_id=?1 AND organization_id=?2 AND user_id=?3`)
      .bind(event.eventId, String(user.organizationId), String(user.id))
      .first<{ occurredAt: number }>();
    if (existingEvent) {
      event = adaptPlatformGameCompletion(completionBody, {
        ...completionContext,
        completedAt: Number(existingEvent.occurredAt),
      });
    }
    const result = await publishOfficialCoreEvent(env, event, event.occurredAt);
    if (body.dailySelectionId) {
      await finishDailyParticipation(env, {
        organizationId: String(user.organizationId),
        userId: String(user.id),
      }, body.dailySelectionId, event.eventId, event.occurredAt);
    }
    if (body.freePlaySelectionId) {
      await finishFreePlayParticipation(env, {
        organizationId: String(user.organizationId),
        userId: String(user.id),
      }, body.freePlaySelectionId, event.eventId, event.occurredAt);
    }
    if (body.eventSelectionId && eventRow) {
      await finishEventParticipation(env, {
        organizationId: String(user.organizationId), userId: String(user.id),
      }, eventRow.eventId, body.eventSelectionId, event.eventId,
      event.payload.correctAnswers > 0 ? "won" : "lost", event.occurredAt);
    }
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
