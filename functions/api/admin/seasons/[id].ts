import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { BEST_ATTEMPTS_CTE } from "../../../_lib/ranking";
import { json,verifyPassword } from "../../../_lib/security";

export const onRequestPatch=async({request,env,params}:{request:Request;env:AppEnv;params:{id:string}})=>{try{
  const user:any=await requirePermission(request,env,"rounds.manage"),body:any=await request.json();
  const status=body.status===undefined?null:String(body.status),title=body.title===undefined?null:String(body.title).trim();
  if(status&&!['draft','active','closed','cancelled'].includes(status)||title!==null&&title.length<3)return json({error:"invalid_update"},400);
  const season:any=await env.DB.prepare("SELECT * FROM seasons WHERE id=?1 AND organization_id=?2").bind(params.id,user.organizationId).first();
  if(!season)return json({error:"not_found"},404);
  if(status==="closed"){
    if(season.status==="closed")return json({error:"already_closed"},409);
    const credential:any=await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(user.id).first();
    if(!credential||!await verifyPassword(String(body.password||""),credential.password_salt,credential.password_hash))return json({error:"invalid_password"},403);
    const active:any=await env.DB.prepare("SELECT COUNT(*) total FROM rounds WHERE season_id=?1 AND status IN ('scheduled','active') AND closes_at>?2").bind(params.id,Date.now()).first();
    if(Number(active?.total||0)>0&&!body.confirmActiveRounds)return json({error:"active_rounds",count:Number(active.total)},409);
    const ranked=await env.DB.prepare(`WITH ${BEST_ATTEMPTS_CTE},season_best AS (SELECT b.* FROM best_attempts b JOIN rounds r ON r.id=b.round_id WHERE r.season_id=?1),totals AS (SELECT user_id,SUM(score) score,COUNT(*) roundsPlayed,SUM(correct_answers) correctAnswers,COUNT(*)*10 answersTotal,ROUND(AVG(score)) averageScore,MAX(score) bestScore FROM season_best GROUP BY user_id),ordered AS (SELECT *,RANK() OVER(ORDER BY score DESC,correctAnswers DESC) position FROM totals) SELECT * FROM ordered ORDER BY position`).bind(params.id).all();
    const firstLast=await env.DB.prepare(`WITH ${BEST_ATTEMPTS_CTE},season_best AS (SELECT b.user_id,b.round_id,b.score,r.opens_at FROM best_attempts b JOIN rounds r ON r.id=b.round_id WHERE r.season_id=?1),numbered AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY opens_at) firstRow,ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY opens_at DESC) lastRow FROM season_best) SELECT user_id,SUM(CASE WHEN firstRow=1 THEN score ELSE 0 END) firstScore,SUM(CASE WHEN lastRow=1 THEN score ELSE 0 END) lastScore FROM numbered GROUP BY user_id`).bind(params.id).all();
    const evolution=new Map((firstLast.results as any[]).map(r=>[r.user_id,Number(r.lastScore)-Number(r.firstScore)])),now=Date.now();
    const statements:D1PreparedStatement[]=[env.DB.prepare("DELETE FROM season_snapshots WHERE season_id=?1").bind(params.id),env.DB.prepare("DELETE FROM season_awards WHERE season_id=?1").bind(params.id)];
    for(const row of ranked.results as any[]){
      const position=Number(row.position),accuracy=Number(row.answersTotal)?Math.round(Number(row.correctAnswers)/Number(row.answersTotal)*1000)/10:0,improvement=evolution.get(row.user_id)||0;
      statements.push(env.DB.prepare("INSERT INTO season_snapshots(season_id,user_id,position,score,rounds_played,correct_answers,answers_total,accuracy,average_score,best_score,improvement,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)").bind(params.id,row.user_id,position,row.score,row.roundsPlayed,row.correctAnswers,row.answersTotal,accuracy,row.averageScore,row.bestScore,improvement,now));
      const awards:any[]=[];if(position===1)awards.push(["champion","Campeão da temporada","👑"]);else if(position<=3)awards.push(["podium","Pódio da temporada","🏆"]);else if(position<=10)awards.push(["top10","Destaque da temporada","⭐"]);if(Number(row.roundsPlayed)>0)awards.push(["participant","Jornada trimestral","🗓️"]);
      for(const[a,t,i]of awards)statements.push(env.DB.prepare("INSERT INTO season_awards(id,season_id,user_id,award_code,title,icon,earned_at) VALUES(?1,?2,?3,?4,?5,?6,?7)").bind(crypto.randomUUID(),params.id,row.user_id,a,t,i,now));
    }
    statements.push(env.DB.prepare("UPDATE seasons SET status='closed',closed_at=?1,snapshot_created_at=?1,updated_at=?1 WHERE id=?2").bind(now,params.id),env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'season.closed_and_frozen','season',?4,?5,?6)").bind(crypto.randomUUID(),user.organizationId,user.id,params.id,JSON.stringify({participants:ranked.results.length}),now));
    for(let offset=0;offset<statements.length;offset+=40)await env.DB.batch(statements.slice(offset,offset+40));
    return json({ok:true,participants:ranked.results.length,frozen:true});
  }
  const now=Date.now(),result=await env.DB.prepare("UPDATE seasons SET title=COALESCE(?1,title),status=COALESCE(?2,status),updated_at=?3 WHERE id=?4 AND organization_id=?5").bind(title,status,now,params.id,user.organizationId).run();
  if(!result.meta.changes)return json({error:"not_found"},404);
  await env.DB.prepare("INSERT INTO audit_logs(id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES(?1,?2,?3,'season.updated','season',?4,?5,?6)").bind(crypto.randomUUID(),user.organizationId,user.id,params.id,JSON.stringify({title,status}),now).run();
  return json({ok:true});
}catch(response){if(response instanceof Response)return response;throw response;}};
