import { requireUser, type AppEnv } from "../../../_lib/auth";
import { json } from "../../../_lib/security";
import { syncBadges } from "../../../_lib/badges";
import { attemptGraceDeadline } from "../../../_lib/attempt-window";

export const onRequestPost=async({request,env,params}:{request:Request;env:AppEnv;params:{id:string}})=>{try{
  const user:any=await requireUser(request,env),attempt:any=await env.DB.prepare("SELECT a.*,r.closes_at FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.id=?1 AND a.user_id=?2 AND a.status='in_progress'").bind(params.id,user.id).first();
  if(!attempt||Date.now()>attemptGraceDeadline(Number(attempt.closes_at)))return json({error:"attempt_unavailable"},404);
  const stats:any=await env.DB.prepare("SELECT COUNT(*) total,COALESCE(SUM(points),0) score,COALESCE(SUM(correct),0) correctAnswers,COALESCE(SUM(response_time_ms),0) totalTime FROM attempt_answers WHERE attempt_id=?1").bind(params.id).first(),totalQuestions:any=await env.DB.prepare("SELECT COUNT(*) total FROM questions WHERE round_id=?1 AND active=1").bind(attempt.round_id).first();
  if(Number(stats.total)!==Number(totalQuestions.total))return json({error:"incomplete_attempt"},400);
  const rows:any=await env.DB.prepare("SELECT correct FROM attempt_answers WHERE attempt_id=?1 ORDER BY question_order").bind(params.id).all();let streak=0,maxStreak=0;for(const row of rows.results as any[]){streak=row.correct?streak+1:0;maxStreak=Math.max(maxStreak,streak)}
  const result=await env.DB.prepare("UPDATE attempts SET status='completed',score=?1,correct_answers=?2,total_time_ms=?3,max_streak=?4,completed_at=?5 WHERE id=?6 AND status='in_progress'").bind(stats.score,stats.correctAnswers,stats.totalTime,maxStreak,Date.now(),params.id).run();
  if(!result.meta.changes)return json({error:"attempt_already_finished"},409);
  await syncBadges(env,user.id);return json({ok:true,result:{score:stats.score,correctAnswers:stats.correctAnswers,totalTimeMs:stats.totalTime,maxStreak}});
}catch(response){if(response instanceof Response)return response;throw response;}};
