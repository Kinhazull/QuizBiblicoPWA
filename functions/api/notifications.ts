import { requireUser, type AppEnv } from "../_lib/auth";
import { enforceRateLimit, requestFingerprint } from "../_lib/abuse";
import { organizationDayKey } from "../_lib/platform-daily-objectives";
import { json } from "../_lib/security";
import { COLLECTIBLE_CATALOG } from "../../shared/platform-collections";

type Notice = { key: string; type: string; icon: string; title: string; message: string; href: string; createdAt: number; priority?: string };

async function dailyRewardNotices(env: AppEnv, user: any, now: number): Promise<Notice[]> {
  const organization = await env.DB.prepare("SELECT timezone FROM organizations WHERE id=?1")
    .bind(user.organizationId).first<{ timezone: string | null }>();
  const dayKey = organizationDayKey(now, String(organization?.timezone || "America/Sao_Paulo"));
  const result = await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN p.status='FINISHED'
      AND CAST(json_extract(e.payload_json,'$.correctAnswers') AS INTEGER)>0 THEN p.game_type END) wins
    FROM generated_game_participations p
    JOIN generated_game_selections s ON s.id=p.selection_id AND s.organization_id=p.organization_id
    LEFT JOIN core_platform_events e ON e.event_id=p.finish_event_id AND e.organization_id=p.organization_id
    WHERE p.organization_id=?1 AND p.user_id=?2 AND p.mode='DAILY' AND s.selection_key LIKE ?3`)
    .bind(user.organizationId, user.id, `daily:${dayKey}:%`).first<{ wins: number }>();
  const wins = Number(result?.wins || 0);
  const notices: Notice[] = [];
  for (const target of [3, 7] as const) {
    if (wins < target) continue;
    const claimed = await env.DB.prepare(`SELECT 1 claimed FROM platform_xp_ledger
      WHERE organization_id=?1 AND user_id=?2 AND source_type=?3 AND source_id=?4 AND applied_at IS NOT NULL LIMIT 1`)
      .bind(user.organizationId, user.id, `daily_challenge_${target}`, dayKey).first();
    if (!claimed) notices.push({
      key: `daily-reward-${dayKey}-${target}`, type: "daily_reward", icon: "🎁",
      title: `Recompensa de ${target}/7 disponível`,
      message: target === 7 ? "Resgate XP, moedas e o Avatar Lâmpada." : "Sua meta intermediária está pronta para resgate.",
      href: "/desafios-diarios", createdAt: now, priority: "important",
    });
  }
  return notices;
}

async function platformNotices(env: AppEnv, user: any, now: number): Promise<Notice[]> {
  const [achievements, collectibles, events] = await Promise.all([
    env.DB.prepare(`SELECT ua.achievement_code code,ua.unlocked_at unlockedAt,d.name
      FROM user_platform_achievements ua JOIN platform_achievement_definitions d ON d.id=ua.definition_id
      WHERE ua.organization_id=?1 AND ua.user_id=?2 AND ua.unlocked_at>=?3 ORDER BY ua.unlocked_at DESC LIMIT 10`)
      .bind(user.organizationId, user.id, now - 30 * 86400000).all<any>(),
    env.DB.prepare(`SELECT source_id itemId,created_at createdAt FROM platform_coin_ledger
      WHERE organization_id=?1 AND user_id=?2 AND source_type='collectible_grant' AND applied_at IS NOT NULL AND created_at>=?3
      ORDER BY created_at DESC LIMIT 10`).bind(user.organizationId, user.id, now - 30 * 86400000).all<any>(),
    env.DB.prepare(`SELECT id,title,starts_at startsAt,ends_at endsAt,status FROM platform_events
      WHERE organization_id=?1 AND status IN ('SCHEDULED','ACTIVE') AND ends_at>?2 AND starts_at<?3 ORDER BY starts_at LIMIT 10`)
      .bind(user.organizationId, now, now + 48 * 3600000).all<any>(),
  ]);
  const result: Notice[] = [];
  for (const row of achievements.results || []) result.push({
    key: `achievement-${row.code}-${row.unlockedAt}`, type: "achievement", icon: "🏆", title: "Nova conquista",
    message: String(row.name), href: "/recompensas", createdAt: Number(row.unlockedAt),
  });
  for (const row of collectibles.results || []) {
    const item = COLLECTIBLE_CATALOG.find(entry => entry.id === row.itemId);
    if (item) result.push({ key: `collectible-${row.itemId}`, type: "collectible", icon: item.icon, title: "Novo colecionável", message: `${item.name} foi adicionado à sua coleção.`, href: "/recompensas", createdAt: Number(row.createdAt) });
  }
  for (const row of events.results || []) {
    const active = row.status === "ACTIVE" || Number(row.startsAt) <= now;
    const ending = active && Number(row.endsAt) - now <= 24 * 3600000;
    result.push({
      key: `event-${row.id}-${ending ? "ending" : active ? "active" : "starting"}`,
      type: "event", icon: "📅", title: ending ? "Evento terminando em breve" : active ? "Evento ativo" : "Evento começando em breve",
      message: String(row.title), href: `/eventos/detalhes?id=${encodeURIComponent(String(row.id))}`,
      createdAt: active ? Number(row.startsAt) : now, priority: "important",
    });
  }
  return result;
}

async function notices(env: AppEnv, user: any) {
  const now = Date.now();
  const announcements = await env.DB.prepare(`SELECT id,title,body,priority,publish_at publishAt FROM announcements
    WHERE organization_id=?1 AND active=1 AND publish_at<=?2 AND (expires_at IS NULL OR expires_at>?2)
      AND (audience='all' OR audience=?3) ORDER BY publish_at DESC LIMIT 30`)
    .bind(user.organizationId, now, ["admin", "leader"].includes(user.role) ? "leaders" : "participants").all<any>();
  const items: Notice[] = (announcements.results || []).map(row => ({
    key: `announcement-${row.id}`, type: "announcement", icon: row.priority === "urgent" ? "🚨" : row.priority === "important" ? "📣" : "💬",
    title: row.title, message: row.body, href: "/notificacoes", createdAt: Number(row.publishAt), priority: row.priority,
  }));
  const [daily, platform] = await Promise.all([dailyRewardNotices(env, user, now), platformNotices(env, user, now)]);
  items.push(...daily, ...platform);
  const read = await env.DB.prepare("SELECT notification_key FROM notification_receipts WHERE user_id=?1").bind(user.id).all<any>();
  const seen = new Set((read.results || []).map(row => row.notification_key));
  return items.sort((a, b) => b.createdAt - a.createdAt).map(item => ({ ...item, read: seen.has(item.key) }));
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const notifications = await notices(env, user);
    return json({ notifications, unread: notifications.filter(item => !item.read).length });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const user: any = await requireUser(request, env);
    const fingerprint = await requestFingerprint(request);
    const retry = await enforceRateLimit(env, `notifications:${user.id}:${fingerprint}`, 60, 10 * 60 * 1000);
    if (retry) return json({ error: "too_many_requests", retryAfter: retry }, 429, { "retry-after": String(retry) });
    const body: any = await request.json(); const now = Date.now(); const items = await notices(env, user);
    if (body.all) {
      const statements = [...items.filter(item => !item.read).map(item => env.DB.prepare("INSERT OR REPLACE INTO notification_receipts (user_id,notification_key,read_at) VALUES (?1,?2,?3)").bind(user.id, item.key, now)), env.DB.prepare("DELETE FROM notification_receipts WHERE user_id=?1 AND read_at<?2").bind(user.id, now - 90 * 86400000)];
      await env.DB.batch(statements); return json({ ok: true });
    }
    const key = String(body.key || "");
    if (!key || key.length > 120 || !items.some(item => item.key === key)) return json({ error: "invalid_key" }, 400);
    await env.DB.prepare("INSERT OR REPLACE INTO notification_receipts (user_id,notification_key,read_at) VALUES (?1,?2,?3)").bind(user.id, key, now).run();
    return json({ ok: true });
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
