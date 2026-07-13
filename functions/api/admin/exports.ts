import { requireAdmin, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

function csv(rows: any[], columns: { key: string; label: string }[]) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return "\uFEFF" + [columns.map(column => escape(column.label)).join(";"), ...rows.map(row => columns.map(column => escape(row[column.key])).join(";"))].join("\r\n");
}

export const onRequestGet = async ({ request, env }: { request: Request; env: AppEnv }) => {
  try {
    const admin: any = await requireAdmin(request, env); const url = new URL(request.url); const type = url.searchParams.get("type") || "members"; const roundId = url.searchParams.get("roundId");
    let rows: any[] = []; let columns: { key: string; label: string }[] = []; let filename = type;
    if (type === "members") {
      ({ results: rows } = await env.DB.prepare(`SELECT display_name AS name,username,COALESCE(nickname,'') AS nickname,role,status,created_at AS createdAt,last_login_at AS lastLoginAt FROM users WHERE organization_id=?1 ORDER BY display_name`).bind(admin.organizationId).all());
      rows = rows.map(row => ({ ...row, createdAt: new Date(row.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Nunca" }));
      columns = [{key:"name",label:"Nome"},{key:"username",label:"Usuário"},{key:"nickname",label:"Apelido"},{key:"role",label:"Função"},{key:"status",label:"Situação"},{key:"createdAt",label:"Cadastro"},{key:"lastLoginAt",label:"Último acesso"}];
    } else if (type === "ranking") {
      ({ results: rows } = await env.DB.prepare(`WITH best AS (SELECT user_id,round_id,MAX(score) score FROM attempts WHERE mode='official' AND status='completed' GROUP BY user_id,round_id) SELECT CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END AS name,SUM(best.score) AS score,ROUND(AVG(best.score)) AS average,COUNT(*) AS rounds FROM users u JOIN best ON best.user_id=u.id WHERE u.organization_id=?1 GROUP BY u.id ORDER BY score DESC`).bind(admin.organizationId).all());
      rows = rows.map((row,index)=>({...row,position:index+1})); columns=[{key:"position",label:"Posição"},{key:"name",label:"Nome no ranking"},{key:"score",label:"Pontuação geral"},{key:"average",label:"Média"},{key:"rounds",label:"Rodadas concluídas"}];
    } else if (type === "results") {
      const condition = roundId ? "AND r.id=?2" : ""; const bindings = roundId ? [admin.organizationId,roundId] : [admin.organizationId];
      ({ results: rows } = await env.DB.prepare(`SELECT r.title AS round,u.display_name AS name,u.username,a.attempt_number AS attempt,a.mode,a.score,a.correct_answers AS correctAnswers,a.total_time_ms AS totalTime,a.max_streak AS maxStreak,a.completed_at AS completedAt FROM attempts a JOIN users u ON u.id=a.user_id JOIN rounds r ON r.id=a.round_id WHERE u.organization_id=?1 AND a.status='completed' ${condition} ORDER BY r.opens_at DESC,a.score DESC`).bind(...bindings).all());
      rows=rows.map(row=>({...row,totalTime:(Number(row.totalTime)/1000).toFixed(1),completedAt:new Date(row.completedAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})})); columns=[{key:"round",label:"Rodada"},{key:"name",label:"Nome"},{key:"username",label:"Usuário"},{key:"attempt",label:"Tentativa"},{key:"mode",label:"Modo"},{key:"score",label:"Pontos"},{key:"correctAnswers",label:"Acertos"},{key:"totalTime",label:"Tempo (s)"},{key:"maxStreak",label:"Maior sequência"},{key:"completedAt",label:"Conclusão"}];
    } else if (type === "audit") {
      ({ results: rows } = await env.DB.prepare(`SELECT l.created_at AS createdAt,COALESCE(u.display_name,'Sistema') AS actor,l.action,l.entity_type AS entityType,l.entity_id AS entityId,l.details_json AS details FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_user_id WHERE l.organization_id=?1 ORDER BY l.created_at DESC LIMIT 5000`).bind(admin.organizationId).all());
      rows=rows.map(row=>({...row,createdAt:new Date(row.createdAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})})); columns=[{key:"createdAt",label:"Data"},{key:"actor",label:"Responsável"},{key:"action",label:"Ação"},{key:"entityType",label:"Tipo"},{key:"entityId",label:"Registro"},{key:"details",label:"Detalhes"}];
    } else return json({ error: "invalid_export" }, 400);
    const date = new Date().toISOString().slice(0,10); return new Response(csv(rows,columns),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="conte-os-feitos-${filename}-${date}.csv"`,"cache-control":"no-store"}});
  } catch (response) { if (response instanceof Response) return response; throw response; }
};
