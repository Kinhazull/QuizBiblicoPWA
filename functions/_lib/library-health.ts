import type { AppEnv } from "./auth";
import { registeredGameGenerationCapabilities } from "./universal-game-generation-capabilities";

export const LIBRARY_HEALTH_THRESHOLDS = Object.freeze({
  minimumCatalogForDistribution: 20,
  dominantCategoryPercent: 50,
  lowDifficultyPercent: 10,
  lowUsageAverageMinimum: 4,
  lowUsageMaximum: 1,
  overuseMinimum: 5,
  overuseAverageMultiplier: 3,
  reservationAttentionPercent: 25,
  reservationCriticalPercent: 50,
});

export type LibraryHealthSeverity = "info" | "attention" | "critical";
export type LibraryHealthRule =
  | "category_concentration" | "difficulty_missing" | "difficulty_low"
  | "small_catalog" | "unused_content" | "low_usage" | "overused_content"
  | "reservation_impact" | "published_without_projection";

export type LibraryHealthInsight = {
  id: string;
  rule: LibraryHealthRule;
  severity: LibraryHealthSeverity;
  gameType: string | null;
  title: string;
  description: string;
  recommendation: string;
  count: number;
  percentage: number | null;
};

type CatalogRow = {
  gameType: string; category: string; difficulty: string; availabilityStatus: string;
  total: number; neverUsed: number; lowUsed: number; usageTotal: number;
};
type UnprojectedRow = { gameType: string; total: number };
type OverusedRow = { gameType: string; total: number; maximumUses: number; averageUses: number };
type ReservationRow = { gameType: string; eventTitle: string; total: number };

export type LibraryHealthInput = {
  catalog: CatalogRow[];
  unprojected: UnprojectedRow[];
  overused: OverusedRow[];
  reservations: ReservationRow[];
};

const gameLabels: Record<string, string> = {
  "quiz-biblico": "Quiz Bíblico", "wordle-biblico": "Wordle Bíblico",
  "linha-do-tempo-biblica": "Linha do Tempo", "memoria-biblica": "Memória Bíblica",
  "associacao-de-temas": "Associação de Temas", "quem-sou-eu": "Quem Sou Eu?",
  "jogo-tres-pistas": "Três Pistas",
};
const gameLabel = (gameType: string) => gameLabels[gameType] || gameType;
const percent = (part: number, total: number) => total ? Math.round(part * 10_000 / total) / 100 : 0;
const number = (value: unknown) => Number(value || 0);

export function deriveLibraryHealth(input: LibraryHealthInput) {
  const insights: LibraryHealthInsight[] = [];
  const byGame = new Map<string, CatalogRow[]>();
  for (const row of input.catalog) {
    const normalized = { ...row, total: number(row.total), neverUsed: number(row.neverUsed), lowUsed: number(row.lowUsed), usageTotal: number(row.usageTotal) };
    byGame.set(row.gameType, [...(byGame.get(row.gameType) || []), normalized]);
  }

  for (const capability of registeredGameGenerationCapabilities()) {
    const rows = byGame.get(capability.gameType) || [];
    const usable = rows.filter(row => row.availabilityStatus === "AVAILABLE" || row.availabilityStatus === "RESERVED_EVENT");
    const available = rows.filter(row => row.availabilityStatus === "AVAILABLE").reduce((sum, row) => sum + row.total, 0);
    const operationalMinimum = Math.max(10, Math.max(...capability.allowedCounts));
    if (available < operationalMinimum) {
      insights.push({ id: `small_catalog:${capability.gameType}`, rule: "small_catalog", severity: available < capability.minimumContents ? "critical" : "attention", gameType: capability.gameType,
        title: `${gameLabel(capability.gameType)} possui catálogo disponível pequeno`,
        description: `${available} conteúdo(s) disponíveis; o limite operacional documentado é ${operationalMinimum}.`,
        recommendation: "Publique ou libere conteúdos válidos antes de ampliar a utilização deste jogo.", count: available, percentage: null });
    }

    const usableTotal = usable.reduce((sum, row) => sum + row.total, 0);
    if (usableTotal >= LIBRARY_HEALTH_THRESHOLDS.minimumCatalogForDistribution) {
      const categories = new Map<string, number>();
      const difficulties = new Map<string, number>();
      for (const row of usable) {
        categories.set(row.category, (categories.get(row.category) || 0) + row.total);
        difficulties.set(row.difficulty, (difficulties.get(row.difficulty) || 0) + row.total);
      }
      const dominant = [...categories].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
      if (dominant && percent(dominant[1], usableTotal) > LIBRARY_HEALTH_THRESHOLDS.dominantCategoryPercent) {
        const share = percent(dominant[1], usableTotal);
        insights.push({ id: `category_concentration:${capability.gameType}:${dominant[0]}`, rule: "category_concentration", severity: "attention", gameType: capability.gameType,
          title: `${gameLabel(capability.gameType)} está concentrado em ${dominant[0]}`,
          description: `${dominant[1]}/${usableTotal} conteúdos (${share}%) pertencem à mesma categoria.`,
          recommendation: "Considere ampliar outras categorias na próxima curadoria editorial.", count: dominant[1], percentage: share });
      }
      if (capability.supportsDifficulty) {
        for (const difficulty of ["EASY", "MEDIUM", "HARD"]) {
          const count = difficulties.get(difficulty) || 0;
          const share = percent(count, usableTotal);
          if (count === 0) insights.push({ id: `difficulty_missing:${capability.gameType}:${difficulty}`, rule: "difficulty_missing", severity: "attention", gameType: capability.gameType,
            title: `${gameLabel(capability.gameType)} não possui dificuldade ${difficulty}`,
            description: `Nenhum dos ${usableTotal} conteúdos utilizáveis possui esta dificuldade.`, recommendation: "Revise a cobertura editorial antes de oferecer filtros por dificuldade.", count: 0, percentage: 0 });
          else if (share < LIBRARY_HEALTH_THRESHOLDS.lowDifficultyPercent) insights.push({ id: `difficulty_low:${capability.gameType}:${difficulty}`, rule: "difficulty_low", severity: "info", gameType: capability.gameType,
            title: `${gameLabel(capability.gameType)} possui baixa cobertura ${difficulty}`,
            description: `${count}/${usableTotal} conteúdos (${share}%) possuem esta dificuldade.`, recommendation: "Considere esta lacuna na próxima curadoria, sem alterar dificuldade automaticamente.", count, percentage: share });
        }
      }
    }

    const availableRows = rows.filter(row => row.availabilityStatus === "AVAILABLE");
    const neverUsed = availableRows.reduce((sum, row) => sum + row.neverUsed, 0);
    const lowUsed = availableRows.reduce((sum, row) => sum + row.lowUsed, 0) - neverUsed;
    const usageTotal = availableRows.reduce((sum, row) => sum + row.usageTotal, 0);
    const average = available ? usageTotal / available : 0;
    if (neverUsed > 0) insights.push({ id: `unused_content:${capability.gameType}`, rule: "unused_content", severity: "info", gameType: capability.gameType,
      title: `${gameLabel(capability.gameType)} possui conteúdos nunca utilizados`, description: `${neverUsed}/${available} conteúdos disponíveis ainda não foram utilizados.`,
      recommendation: "Use este sinal apenas para diversificar seleções; ele não mede qualidade editorial.", count: neverUsed, percentage: percent(neverUsed, available) });
    if (average >= LIBRARY_HEALTH_THRESHOLDS.lowUsageAverageMinimum && lowUsed > 0) insights.push({ id: `low_usage:${capability.gameType}`, rule: "low_usage", severity: "info", gameType: capability.gameType,
      title: `${gameLabel(capability.gameType)} possui conteúdos pouco utilizados`, description: `${lowUsed} conteúdo(s) possuem somente uma utilização, diante de média ${average.toFixed(1)}.`,
      recommendation: "Considere aumentar a diversidade de seleção, sem inferir baixa qualidade.", count: lowUsed, percentage: percent(lowUsed, available) });
  }

  for (const row of input.overused) insights.push({ id: `overused_content:${row.gameType}`, rule: "overused_content", severity: "attention", gameType: row.gameType,
    title: `${gameLabel(row.gameType)} possui conteúdo sobreutilizado`, description: `${number(row.total)} item(ns) atingem pelo menos 3× a média do jogo; o maior uso é ${number(row.maximumUses)}.`,
    recommendation: "Revise prioridade e diversidade das seleções; uso elevado não invalida o conteúdo.", count: number(row.total), percentage: null });

  const totals = new Map<string, number>();
  for (const row of input.catalog) if (row.availabilityStatus === "AVAILABLE" || row.availabilityStatus === "RESERVED_EVENT") totals.set(row.gameType, (totals.get(row.gameType) || 0) + number(row.total));
  for (const row of input.reservations) {
    const total = totals.get(row.gameType) || 0;
    const share = percent(number(row.total), total);
    if (share >= LIBRARY_HEALTH_THRESHOLDS.reservationAttentionPercent) insights.push({ id: `reservation_impact:${row.gameType}:${row.eventTitle}`, rule: "reservation_impact", severity: share >= LIBRARY_HEALTH_THRESHOLDS.reservationCriticalPercent ? "critical" : "attention", gameType: row.gameType,
      title: `${row.eventTitle} reduz o catálogo de ${gameLabel(row.gameType)}`, description: `${number(row.total)}/${total} conteúdos (${share}%) estão reservados por este Evento.`,
      recommendation: "Confirme que o catálogo restante sustenta Diário e Modo Livre durante o Evento.", count: number(row.total), percentage: share });
  }
  for (const row of input.unprojected) insights.push({ id: `published_without_projection:${row.gameType}`, rule: "published_without_projection", severity: "critical", gameType: row.gameType,
    title: `${gameLabel(row.gameType)} possui publicação sem projeção`, description: `${number(row.total)} conteúdo(s) publicados não aparecem na Biblioteca na versão atual.`,
    recommendation: "Execute o diagnóstico e a sincronização administrativa oficial; não edite registros manualmente.", count: number(row.total), percentage: null });

  const order: Record<LibraryHealthSeverity, number> = { critical: 0, attention: 1, info: 2 };
  insights.sort((left, right) => order[left.severity] - order[right.severity] || left.gameType?.localeCompare(right.gameType || "") || left.id.localeCompare(right.id));
  const counts = { critical: 0, attention: 0, info: 0 };
  for (const insight of insights) counts[insight.severity] += 1;
  return { status: counts.critical ? "critical" : counts.attention ? "attention" : counts.info ? "info" : "healthy", counts, total: insights.length, insights };
}

export async function getLibraryHealth(env: AppEnv, organizationId: string, now = Date.now()) {
  const [catalog, unprojected, overused, reservations] = await Promise.all([
    env.DB.prepare(`SELECT library.game_type gameType,item.category,library.difficulty,library.availability_status availabilityStatus,
      COUNT(*) total,SUM(CASE WHEN library.usage_count=0 THEN 1 ELSE 0 END) neverUsed,
      SUM(CASE WHEN library.usage_count<=?2 THEN 1 ELSE 0 END) lowUsed,SUM(library.usage_count) usageTotal
      FROM universal_content_library library JOIN content_items item
        ON item.organization_id=library.organization_id AND item.id=library.content_id AND item.version=library.content_version
      WHERE library.organization_id=?1 AND item.status='PUBLISHED'
      GROUP BY library.game_type,item.category,library.difficulty,library.availability_status`)
      .bind(organizationId, LIBRARY_HEALTH_THRESHOLDS.lowUsageMaximum).all<CatalogRow>(),
    env.DB.prepare(`SELECT item.game_type gameType,COUNT(*) total FROM content_items item
      LEFT JOIN universal_content_library library ON library.organization_id=item.organization_id AND library.content_id=item.id AND library.content_version=item.version
      WHERE item.organization_id=?1 AND item.status='PUBLISHED' AND library.content_id IS NULL GROUP BY item.game_type`)
      .bind(organizationId).all<UnprojectedRow>(),
    env.DB.prepare(`WITH eligible AS (
        SELECT game_type gameType,usage_count usageCount,AVG(usage_count) OVER(PARTITION BY game_type) averageUses,COUNT(*) OVER(PARTITION BY game_type) catalogSize
        FROM universal_content_library WHERE organization_id=?1 AND availability_status='AVAILABLE'
      ) SELECT gameType,COUNT(*) total,MAX(usageCount) maximumUses,MAX(averageUses) averageUses FROM eligible
      WHERE catalogSize>=10 AND usageCount>=?2 AND usageCount>=averageUses*?3 GROUP BY gameType LIMIT 20`)
      .bind(organizationId, LIBRARY_HEALTH_THRESHOLDS.overuseMinimum, LIBRARY_HEALTH_THRESHOLDS.overuseAverageMultiplier).all<OverusedRow>(),
    env.DB.prepare(`SELECT library.game_type gameType,event.title eventTitle,COUNT(*) total
      FROM platform_event_content_reservations reservation
      JOIN universal_content_library library ON library.organization_id=reservation.organization_id AND library.content_id=reservation.content_id AND library.content_version=reservation.content_version
      JOIN platform_events event ON event.organization_id=reservation.organization_id AND event.id=reservation.event_id
      WHERE reservation.organization_id=?1 AND reservation.released_at IS NULL AND reservation.starts_at<=?2 AND reservation.ends_at>?2
      GROUP BY library.game_type,event.id,event.title LIMIT 50`).bind(organizationId, now).all<ReservationRow>(),
  ]);
  return { generatedAt: now, thresholds: LIBRARY_HEALTH_THRESHOLDS, ...deriveLibraryHealth({ catalog: catalog.results || [], unprojected: unprojected.results || [], overused: overused.results || [], reservations: reservations.results || [] }) };
}
