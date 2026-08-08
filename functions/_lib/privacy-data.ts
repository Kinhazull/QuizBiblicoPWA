import type { AppEnv } from "./auth";
import { getUserStatistics } from "./platform-statistics";

type Identity = { id: string; organizationId: string };

const rows = async (statement: D1PreparedStatement) => (await statement.all()).results;

export async function exportUserData(env: AppEnv, user: Identity) {
  const bindUser = (sql: string) => env.DB.prepare(sql).bind(user.id, user.organizationId);
  const [profile, legacyAttempts, legacyAnswers, badges, achievements, missions, missionProgress,
    xpLedger, coinLedger, progress, events, activeDays, officialDays, gameDifficulties, consents,
    notifications, selections, participations, participationUsage, eventParticipations, eventRewards,
    authoredContent, reviewedContent, changedVersions] = await Promise.all([
    bindUser(`SELECT id,organization_id organizationId,group_id groupId,username,display_name displayName,
      nickname,bio,favorite_book favoriteBook,favorite_verse favoriteVerse,role,status,
      use_nickname_in_ranking useNicknameInRanking,profile_public profilePublic,created_at createdAt,
      updated_at updatedAt,last_login_at lastLoginAt FROM users WHERE id=?1 AND organization_id=?2`).first(),
    bindUser(`SELECT a.id,a.round_id roundId,r.title,a.attempt_number attemptNumber,a.mode,a.status,a.score,
      a.correct_answers correctAnswers,a.total_time_ms totalTimeMs,a.max_streak maxStreak,
      a.started_at startedAt,a.completed_at completedAt FROM attempts a JOIN rounds r ON r.id=a.round_id
      WHERE a.user_id=?1 AND r.organization_id=?2 ORDER BY a.started_at DESC`).all().then(result => result.results),
    bindUser(`SELECT aa.attempt_id attemptId,aa.question_order questionOrder,aa.correct,
      aa.response_time_ms responseTimeMs,aa.points,aa.answered_at answeredAt
      FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id
      WHERE a.user_id=?1 AND r.organization_id=?2 ORDER BY aa.answered_at DESC`).all().then(result => result.results),
    rows(bindUser(`SELECT b.badge_code code,b.earned_at earnedAt FROM user_badges b JOIN users u ON u.id=b.user_id
      WHERE b.user_id=?1 AND u.organization_id=?2`)),
    rows(bindUser(`SELECT achievement_code code,scope_key scopeKey,source_event_id sourceEventId,
      unlocked_at unlockedAt FROM user_platform_achievements WHERE user_id=?1 AND organization_id=?2`)),
    rows(bindUser(`SELECT id,mission_code code,cadence,scope_key scopeKey,window_key windowKey,target,progress,state,
      assigned_at assignedAt,expires_at expiresAt,completed_at completedAt,claimed_at claimedAt
      FROM user_platform_missions WHERE user_id=?1 AND organization_id=?2 ORDER BY assigned_at DESC`)),
    rows(bindUser(`SELECT e.id,e.assignment_id assignmentId,e.event_id eventId,e.amount,e.created_at createdAt,e.applied_at appliedAt
      FROM user_platform_mission_progress_events e WHERE e.user_id=?1 AND e.organization_id=?2`)),
    rows(bindUser(`SELECT id,event_id eventId,amount,reason,source_type sourceType,source_id sourceId,
      created_at createdAt,applied_at appliedAt FROM platform_xp_ledger
      WHERE user_id=?1 AND organization_id=?2 ORDER BY created_at DESC`)),
    rows(bindUser(`SELECT id,event_id eventId,amount,reason,source_type sourceType,source_id sourceId,
      created_at createdAt,applied_at appliedAt FROM platform_coin_ledger
      WHERE user_id=?1 AND organization_id=?2 ORDER BY created_at DESC`)),
    bindUser(`SELECT total_xp totalXp,coins,created_at createdAt,updated_at updatedAt FROM user_platform_progress
      WHERE user_id=?1 AND organization_id=?2`).first(),
    rows(bindUser(`SELECT event_id eventId,event_type eventType,event_version version,occurred_at occurredAt,
      source_kind sourceKind,source_service sourceService,source_game_id sourceGameId,source_id sourceId,status
      FROM core_platform_events WHERE user_id=?1 AND organization_id=?2 ORDER BY occurred_at DESC`)),
    rows(bindUser(`SELECT day_key dayKey,first_activity_at firstActivityAt,last_activity_at lastActivityAt
      FROM user_platform_statistics_active_days WHERE user_id=?1 AND organization_id=?2 ORDER BY day_key DESC`)),
    rows(bindUser(`SELECT day_key dayKey,first_completion_at firstCompletionAt,last_completion_at lastCompletionAt
      FROM user_platform_statistics_official_days_utc WHERE user_id=?1 AND organization_id=?2 ORDER BY day_key DESC`)),
    rows(bindUser(`SELECT game_id gameId,difficulty_key difficulty,sessions_completed sessionsCompleted
      FROM user_platform_game_difficulty_statistics WHERE user_id=?1 AND organization_id=?2`)),
    rows(bindUser(`SELECT c.terms_version termsVersion,c.privacy_version privacyVersion,c.accepted_at acceptedAt
      FROM legal_consents c JOIN users u ON u.id=c.user_id WHERE c.user_id=?1 AND u.organization_id=?2`)),
    rows(bindUser(`SELECT n.notification_key notificationKey,n.read_at readAt FROM notification_receipts n
      JOIN users u ON u.id=n.user_id WHERE n.user_id=?1 AND u.organization_id=?2`)),
    rows(bindUser(`SELECT id,game_type gameType,mode,selection_key selectionKey,algorithm_version algorithmVersion,status,
      created_at createdAt,expires_at expiresAt FROM generated_game_selections
      WHERE requested_by_user_id=?1 AND organization_id=?2 ORDER BY created_at DESC`)),
    rows(bindUser(`SELECT id,selection_id selectionId,game_type gameType,mode,status,started_at startedAt,
      finished_at finishedAt,created_at createdAt FROM generated_game_participations
      WHERE user_id=?1 AND organization_id=?2 ORDER BY created_at DESC`)),
    rows(bindUser(`SELECT u.participation_id participationId,u.content_id contentId,u.content_version contentVersion,
      u.recorded_at recordedAt FROM generated_game_participation_usage u
      JOIN generated_game_participations p ON p.id=u.participation_id
      WHERE p.user_id=?1 AND u.organization_id=?2`)),
    rows(bindUser(`SELECT id,event_id eventId,selection_id selectionId,game_type gameType,status,outcome,
      started_at startedAt,finished_at finishedAt,created_at createdAt FROM platform_event_participations
      WHERE user_id=?1 AND organization_id=?2 ORDER BY created_at DESC`)),
    rows(bindUser(`SELECT id,event_id eventId,reward_type rewardType,xp_amount xpAmount,coin_amount coinAmount,
      created_at createdAt FROM platform_event_reward_ledger WHERE user_id=?1 AND organization_id=?2`)),
    rows(bindUser(`SELECT id,game_type gameType,status,version,created_at createdAt,updated_at updatedAt
      FROM content_items WHERE author_id=?1 AND organization_id=?2`)),
    rows(bindUser(`SELECT id,game_type gameType,status,version,created_at createdAt,updated_at updatedAt
      FROM content_items WHERE reviewer_id=?1 AND organization_id=?2`)),
    rows(bindUser(`SELECT v.id,v.content_id contentId,v.version,v.change_summary changeSummary,v.created_at createdAt
      FROM content_versions v WHERE v.changed_by=?1 AND v.organization_id=?2`)),
  ]);
  const statistics = await getUserStatistics(env, user.id, user.organizationId);
  return {
    format: "conte-os-feitos-user-export",
    version: 2,
    generatedAt: new Date().toISOString(),
    subject: { userId: user.id, organizationId: user.organizationId },
    account: { profile, consents },
    legacyQuiz: { attempts: legacyAttempts, answers: legacyAnswers, badges },
    platform: {
      progress, xpLedger, coinLedger, achievements,
      missions: { assignments: missions, progressEvents: missionProgress },
      statistics: { ...statistics, activeDays, officialDaysUtc: officialDays, gameDifficulties },
      events,
    },
    games: { selections, participations, participationUsage, eventParticipations, eventRewards },
    communications: { notifications },
    editorialContributions: {
      ownershipNotice: "Conteúdo e versões pertencem à organização; esta seção registra somente a contribuição do titular.",
      authoredContent, reviewedContent, changedVersions,
    },
  };
}
