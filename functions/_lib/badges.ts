import type { AppEnv } from "./auth";
import { BEST_ATTEMPTS_CTE } from "./ranking";
export type Badge={code:string;category:string;name:string;description:string;icon:string;metric:string;threshold:number;level:number;tier:string};
const tiers=['Bronze','Prata','Ouro','Platina','Diamante'];
const series=(category:string,label:string,metric:string,levels:number[],icon:string,unit:string):Badge[]=>levels.map((threshold,index)=>({code:`${category}_${index+1}`,category,name:`${label} ${index+1}`,description:`Alcance ${threshold} ${unit}.`,icon,metric,threshold,level:index+1,tier:tiers[Math.min(4,Math.floor(index/2))]}));
export const BADGES:Badge[]=[
 ...series('journey','Caminho da Palavra','roundsPlayed',[1,3,5,8,12,18,25,35,50,75],'📖','rodadas concluídas'),
 ...series('knowledge','Conhecedor','totalCorrect',[10,30,60,100,160,250,400,650,1000,1500],'🧠','acertos acumulados'),
 ...series('score','Luz em Pontos','bestScore',[4000,6000,7500,8500,9500,10500,11500,12500,13500,14500],'✨','pontos em uma tentativa'),
 ...series('streak','Firme na Jornada','bestStreak',[2,3,4,5,6,7,8,9,10,11],'🔥','acertos consecutivos'),
 ...series('presence','Presença Fiel','attempts',[3,8,15,25,40,60,90,130,180,250],'🙌','tentativas oficiais'),
 ...series('perfect','Excelência','perfectRounds',[1,2,3,5,8,12,18,25,35,50],'🌟','rodadas com 10 acertos'),
 ...series('agility','Resposta Ágil','fastCorrect',[5,15,30,50,80,120,180,260,360,500],'⚡','acertos em até 7 segundos'),
 ...series('podium','Entre os Primeiros','podiums',[1,2,3,5,8,12,18,25,35,50],'🏆','pódios semanais'),
 ...series('training','Aprendiz Dedicado','practiceAttempts',[1,3,6,10,15,25,40,60,90,130],'🎯','treinos concluídos'),
 ...series('mastery','Pontuação Consistente','highScoreRounds',[1,2,4,7,10,15,22,30,40,55],'💎','rodadas acima de 9.000 pontos'),
];
export async function badgeStats(env:AppEnv,userId:string){
 const stats:any=await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN a.status='completed' AND a.mode='official' THEN a.round_id END) roundsPlayed,COUNT(CASE WHEN a.status='completed' AND a.mode='official' THEN 1 END) attempts,COALESCE(MAX(CASE WHEN a.mode='official' THEN a.score END),0) bestScore,COALESCE(MAX(CASE WHEN a.mode='official' THEN a.max_streak END),0) bestStreak,COALESCE(SUM(CASE WHEN a.status='completed' AND a.mode='official' THEN a.correct_answers ELSE 0 END),0) totalCorrect,COUNT(DISTINCT CASE WHEN a.status='completed' AND a.mode='official' AND a.correct_answers=10 THEN a.round_id END) perfectRounds,COUNT(CASE WHEN a.status='completed' AND a.mode='practice' THEN 1 END) practiceAttempts,COUNT(DISTINCT CASE WHEN a.status='completed' AND a.mode='official' AND a.score>=9000 THEN a.round_id END) highScoreRounds FROM attempts a JOIN rounds r ON r.id=a.round_id WHERE a.user_id=?1 AND r.status<>'cancelled'`).bind(userId).first();
 const fast:any=await env.DB.prepare(`SELECT COUNT(*) total FROM attempt_answers aa JOIN attempts a ON a.id=aa.attempt_id JOIN rounds r ON r.id=a.round_id WHERE a.user_id=?1 AND a.mode='official' AND a.status='completed' AND r.status<>'cancelled' AND aa.correct=1 AND aa.response_time_ms<=7000`).bind(userId).first();
 const podium:any=await env.DB.prepare(`WITH ${BEST_ATTEMPTS_CTE},ranked AS (SELECT b.round_id,b.user_id,RANK() OVER(PARTITION BY b.round_id ORDER BY b.score DESC,b.correct_answers DESC,b.total_time_ms ASC,b.completed_at ASC,b.id ASC) place FROM best_attempts b JOIN rounds r ON r.id=b.round_id WHERE r.status='closed' OR r.closes_at<=?2) SELECT COUNT(*) total FROM ranked WHERE user_id=?1 AND place<=3`).bind(userId,Date.now()).first();
 return{...stats,fastCorrect:Number(fast?.total||0),podiums:Number(podium?.total||0)}
}
export async function syncBadges(env:AppEnv,userId:string){
 const stats:any=await badgeStats(env,userId),existing:any=await env.DB.prepare("SELECT badge_code FROM user_badges WHERE user_id=?1").bind(userId).all(),owned=new Set<string>((existing.results as any[]).map(item=>item.badge_code)),now=Date.now(),statements:any[]=[];
 for(const badge of BADGES){
  if(owned.has(badge.code)&&Number(stats[badge.metric]||0)<badge.threshold){statements.push(env.DB.prepare("DELETE FROM user_badges WHERE user_id=?1 AND badge_code=?2").bind(userId,badge.code));owned.delete(badge.code)}
 }
 for(const badge of BADGES){if(!owned.has(badge.code)&&Number(stats[badge.metric]||0)>=badge.threshold)statements.push(env.DB.prepare("INSERT OR IGNORE INTO user_badges (user_id,badge_code,earned_at) VALUES (?1,?2,?3)").bind(userId,badge.code,now))}
 if(statements.length)await env.DB.batch(statements);return stats
}
