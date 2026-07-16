import type { AppEnv } from "../../../../_lib/auth";
import { requirePermission } from "../../../../_lib/permissions";
import { BEST_ATTEMPTS_CTE } from "../../../../_lib/ranking";
import { json } from "../../../../_lib/security";

export const onRequestGet=async({request,env,params}:{request:Request;env:AppEnv;params:{id:string}})=>{try{
  const user:any=await requirePermission(request,env,"rounds.manage");
  const season:any=await env.DB.prepare("SELECT * FROM seasons WHERE id=?1 AND organization_id=?2").bind(params.id,user.organizationId).first();
  if(!season)return json({error:"not_found"},404);
  const rounds=await env.DB.prepare(`SELECT id,title,status,round_type roundType,opens_at opensAt,closes_at closesAt,(SELECT COUNT(DISTINCT a.user_id) FROM attempts a WHERE a.round_id=rounds.id AND a.status='completed' AND a.mode='official') participants FROM rounds WHERE season_id=?1 ORDER BY opens_at`).bind(params.id).all();
  const members:any=await env.DB.prepare("SELECT COUNT(*) total FROM users WHERE organization_id=?1 AND status='active' AND role='participant'").bind(user.organizationId).first();
  let ranking:any[]=[];
  if(season.status==="closed") ranking=(await env.DB.prepare(`SELECT ss.*,CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END displayName FROM season_snapshots ss JOIN users u ON u.id=ss.user_id WHERE ss.season_id=?1 ORDER BY ss.position`).bind(params.id).all()).results as any[];
  else ranking=(await env.DB.prepare(`WITH ${BEST_ATTEMPTS_CTE} SELECT u.id user_id,CASE WHEN u.use_nickname_in_ranking=1 AND u.nickname IS NOT NULL THEN u.nickname ELSE u.display_name END displayName,SUM(b.score) score,COUNT(*) rounds_played,SUM(b.correct_answers) correct_answers,ROUND(AVG(b.correct_answers)*10,1) accuracy,RANK() OVER(ORDER BY SUM(b.score) DESC,SUM(b.correct_answers) DESC) position FROM users u JOIN best_attempts b ON b.user_id=u.id JOIN rounds r ON r.id=b.round_id WHERE r.season_id=?1 GROUP BY u.id ORDER BY position`).bind(params.id).all()).results as any[];
  const previous:any=await env.DB.prepare("SELECT id,title FROM seasons WHERE organization_id=?1 AND ends_at<?2 AND status='closed' ORDER BY ends_at DESC LIMIT 1").bind(user.organizationId,season.starts_at).first();
  let comparison=null;
  if(previous){const current:any={participants:ranking.length,avgScore:ranking.length?ranking.reduce((sum,row)=>sum+Number(row.score||0),0)/ranking.length:0,avgAccuracy:ranking.length?ranking.reduce((sum,row)=>sum+Number(row.accuracy||0),0)/ranking.length:0},past:any=await env.DB.prepare("SELECT COUNT(*) participants,COALESCE(AVG(score),0) avgScore,COALESCE(AVG(accuracy),0) avgAccuracy FROM season_snapshots WHERE season_id=?1").bind(previous.id).first();comparison={previous,current,past}}
  const completed=(rounds.results as any[]).filter(r=>r.status==="closed").length,total=rounds.results.length;
  return json({season,rounds:rounds.results,ranking,summary:{roundsTotal:total,roundsCompleted:completed,progress:total?Math.round(completed/total*100):0,participants:ranking.length,activeMembers:Number(members?.total||0),attempts:ranking.reduce((sum,r)=>sum+Number(r.rounds_played||0),0)},highlights:{champion:ranking[0]||null,bestAccuracy:[...ranking].sort((a,b)=>Number(b.accuracy)-Number(a.accuracy))[0]||null,bestEvolution:season.status==="closed"?([...ranking].sort((a,b)=>Number(b.improvement||0)-Number(a.improvement||0))[0]||null):null},comparison});
}catch(response){if(response instanceof Response)return response;throw response;}};
