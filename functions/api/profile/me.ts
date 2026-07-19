import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";
import { BEST_ATTEMPTS_CTE } from "../../_lib/ranking";
import { getUserProgress } from "../../_lib/platform-progress";
import { getAchievementSummary } from "../../_lib/platform-achievements";

export const onRequestGet=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env);
  const preferences:any=await env.DB.prepare("SELECT nickname,use_nickname_in_ranking AS useNicknameInRanking,profile_public AS profilePublic,bio,favorite_book AS favoriteBook,favorite_verse AS favoriteVerse FROM users WHERE id=?1").bind(user.id).first();
  const stats:any=await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN a.status='completed' THEN a.round_id END) roundsPlayed,COUNT(CASE WHEN a.status='completed' THEN 1 END) attempts,COALESCE(MAX(CASE WHEN a.status='completed' THEN a.score END),0) bestScore,COALESCE(MAX(CASE WHEN a.status='completed' THEN a.correct_answers END),0) bestCorrect,COALESCE(MAX(CASE WHEN a.status='completed' THEN a.max_streak END),0) bestStreak,COALESCE(SUM(CASE WHEN a.status='completed' THEN a.correct_answers ELSE 0 END),0) totalCorrect FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.user_id=?1 AND a.mode='official' AND r.status<>'cancelled'`).bind(user.id).first();
  const podiums:any=await env.DB.prepare(`WITH ${BEST_ATTEMPTS_CTE},ranked AS (SELECT round_id,user_id,RANK() OVER(PARTITION BY round_id ORDER BY score DESC,correct_answers DESC,total_time_ms ASC,completed_at ASC,id ASC) place FROM best_attempts) SELECT COUNT(*) total FROM ranked WHERE user_id=?1 AND place<=3`).bind(user.id).first();
  const progress=await getUserProgress(env,user.id,user.organizationId);
  const achievements=await getAchievementSummary(env,user.id,user.organizationId);
  return json({user:{...user,...preferences},stats:{...stats,podiums:Number(podiums?.total||0)},progress,achievements});
}catch(response){if(response instanceof Response)return response;throw response;}};

export const onRequestPatch=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env),body:any=await request.json();
  const nickname=String(body.nickname||'').trim().replace(/\s+/g,' '),bio=String(body.bio||'').trim(),favoriteBook=String(body.favoriteBook||'').trim(),favoriteVerse=String(body.favoriteVerse||'').trim();
  if(nickname.length>30||bio.length>280||favoriteBook.length>50||favoriteVerse.length>80)return json({error:'field_too_long'},400);
  await env.DB.prepare("UPDATE users SET nickname=?1,use_nickname_in_ranking=?2,profile_public=?3,bio=?4,favorite_book=?5,favorite_verse=?6,updated_at=?7 WHERE id=?8").bind(nickname||null,body.useNicknameInRanking&&nickname?1:0,body.profilePublic?1:0,bio||null,favoriteBook||null,favoriteVerse||null,Date.now(),user.id).run();
  return json({ok:true});
}catch(response){if(response instanceof Response)return response;throw response;}};
