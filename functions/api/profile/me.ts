import { requireUser, type AppEnv } from "../../_lib/auth";
import { json } from "../../_lib/security";

export const onRequestGet=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env);
  const preferences:any=await env.DB.prepare("SELECT nickname,use_nickname_in_ranking AS useNicknameInRanking,profile_public AS profilePublic,bio,favorite_book AS favoriteBook,favorite_verse AS favoriteVerse FROM users WHERE id=?1").bind(user.id).first();
  const stats:any=await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN status='completed' THEN round_id END) roundsPlayed,COUNT(CASE WHEN status='completed' THEN 1 END) attempts,COALESCE(MAX(CASE WHEN status='completed' THEN score END),0) bestScore,COALESCE(MAX(CASE WHEN status='completed' THEN correct_answers END),0) bestCorrect,COALESCE(MAX(CASE WHEN status='completed' THEN max_streak END),0) bestStreak,COALESCE(SUM(CASE WHEN status='completed' THEN correct_answers ELSE 0 END),0) totalCorrect FROM attempts WHERE user_id=?1 AND mode='official'`).bind(user.id).first();
  const podiums:any=await env.DB.prepare(`WITH ranked AS (SELECT round_id,user_id,RANK() OVER(PARTITION BY round_id ORDER BY MAX(score) DESC) place FROM attempts WHERE mode='official' AND status='completed' GROUP BY round_id,user_id) SELECT COUNT(*) total FROM ranked WHERE user_id=?1 AND place<=3`).bind(user.id).first();
  return json({user:{...user,...preferences},stats:{...stats,podiums:Number(podiums?.total||0)}});
}catch(response){if(response instanceof Response)return response;throw response;}};

export const onRequestPatch=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env),body:any=await request.json();
  const nickname=String(body.nickname||'').trim().replace(/\s+/g,' '),bio=String(body.bio||'').trim(),favoriteBook=String(body.favoriteBook||'').trim(),favoriteVerse=String(body.favoriteVerse||'').trim();
  if(nickname.length>30||bio.length>280||favoriteBook.length>50||favoriteVerse.length>80)return json({error:'field_too_long'},400);
  await env.DB.prepare("UPDATE users SET nickname=?1,use_nickname_in_ranking=?2,profile_public=?3,bio=?4,favorite_book=?5,favorite_verse=?6,updated_at=?7 WHERE id=?8").bind(nickname||null,body.useNicknameInRanking&&nickname?1:0,body.profilePublic?1:0,bio||null,favoriteBook||null,favoriteVerse||null,Date.now(),user.id).run();
  return json({ok:true});
}catch(response){if(response instanceof Response)return response;throw response;}};
