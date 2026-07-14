import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, randomToken } from "../../_lib/security";
import { seededShuffle } from "../../_lib/shuffle";
import { attemptGraceDeadline, latestAttemptStart } from "../../_lib/attempt-window";
import { enforceRateLimit, requestFingerprint } from "../../_lib/abuse";
import { QUESTION_COUNT } from "../../_lib/questions";

async function hydrate(env:AppEnv,roundId:string,seed:string,storedOrder?:string|null){
  const [questionRows,choiceRows]=await Promise.all([
    env.DB.prepare("SELECT id,reference,prompt FROM questions WHERE round_id=?1 AND active=1 ORDER BY position").bind(roundId).all(),
    env.DB.prepare("SELECT c.id,c.text,c.question_id questionId FROM choices c JOIN questions q ON q.id=c.question_id WHERE q.round_id=?1 AND q.active=1 ORDER BY c.question_id,c.id").bind(roundId).all()
  ]);
  const byId=new Map((questionRows.results as any[]).map(question=>[question.id,question]));
  let questions:any[]=[];
  try{const ids=storedOrder?JSON.parse(storedOrder):null;if(Array.isArray(ids))questions=ids.map(id=>byId.get(id)).filter(Boolean)}catch{}
  if(questions.length!==questionRows.results.length)questions=seededShuffle(questionRows.results as any[],seed);
  const choicesByQuestion=new Map<string,any[]>();
  for(const choice of choiceRows.results as any[]){const list=choicesByQuestion.get(choice.questionId)||[];list.push({id:choice.id,text:choice.text});choicesByQuestion.set(choice.questionId,list)}
  return questions.map(question=>({id:question.id,reference:question.reference,prompt:question.prompt,choices:seededShuffle(choicesByQuestion.get(question.id)||[],`${seed}:${question.id}`)}));
}

export const onRequestPost=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env),fingerprint=await requestFingerprint(request),retry=await enforceRateLimit(env,`attempt-start:${user.id}:${fingerprint}`,20,60*1000);if(retry)return json({error:"too_many_requests",retryAfter:retry},429,{"retry-after":String(retry)});const body:any=await request.json(),roundId=String(body.roundId||""),mode=body.mode==="practice"?"practice":"official",now=Date.now();
  const round:any=await env.DB.prepare("SELECT r.*,(SELECT COUNT(*) FROM questions q WHERE q.round_id=r.id AND q.active=1) question_count FROM rounds r WHERE r.id=?1 AND r.organization_id=?2").bind(roundId,user.organizationId).first();
  if(!round||!["scheduled","active"].includes(round.status)||now<Number(round.opens_at))return json({error:"round_unavailable"},403);
  const rules=round.advanced_rules_json?JSON.parse(round.advanced_rules_json):null;
  if(mode==="practice"){
    if(rules?.allowPractice!==true)return json({error:"practice_disabled"},403);
    const official:any=await env.DB.prepare("SELECT COUNT(*) total FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode='official' AND status<>'invalid'").bind(user.id,roundId).first();
    if(Number(official?.total||0)<Number(round.official_attempt_limit))return json({error:"official_attempts_remaining"},403);
  }
  const existing:any=await env.DB.prepare("SELECT * FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3 AND status='in_progress' ORDER BY started_at DESC LIMIT 1").bind(user.id,roundId,mode).first();
  if(existing){
    if(now>attemptGraceDeadline(Number(round.closes_at)))return json({error:"attempt_expired"},403);
    await env.DB.prepare("UPDATE attempts SET resumed_count=COALESCE(resumed_count,0)+1,last_resumed_at=?1 WHERE id=?2").bind(now,existing.id).run();
    const questions=await hydrate(env,roundId,existing.shuffle_seed,existing.question_order_json);if(questions.length!==QUESTION_COUNT||questions.some(question=>question.choices.length!==4))return json({error:"invalid_round_content"},409);const progress:any=await env.DB.prepare("SELECT COUNT(*) answered,COALESCE(SUM(points),0) score,MAX(answered_at) lastAnsweredAt FROM attempt_answers WHERE attempt_id=?1").bind(existing.id).first(),nextIndex=Number(progress?.answered||0),base=Number(progress?.lastAnsweredAt||existing.started_at),remaining=Math.max(0,Number(round.seconds_per_question)-Math.floor((now-base)/1000));
    return json({attempt:{id:existing.id,attemptNumber:existing.attempt_number,mode,secondsPerQuestion:round.seconds_per_question,questions,resumed:true,nextIndex,score:Number(progress?.score||0),remainingSeconds:remaining,graceDeadline:attemptGraceDeadline(Number(round.closes_at))}});
  }
  if(now>=Number(round.closes_at))return json({error:"round_unavailable"},403);
  const latestStart=latestAttemptStart(Number(round.closes_at),Number(round.question_count||10),Number(round.seconds_per_question));
  if(now>latestStart)return json({error:"round_closing",latestStartAt:latestStart},403);
  const count:any=await env.DB.prepare("SELECT COUNT(*) total FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3 AND status<>'invalid'").bind(user.id,roundId,mode).first(),attemptNumber=Number(count?.total||0)+1;
  if(mode==="official"&&attemptNumber>Number(round.official_attempt_limit))return json({error:"attempt_limit"},403);
  const seed=randomToken(18),questions=await hydrate(env,roundId,seed);if(questions.length!==QUESTION_COUNT||questions.some(question=>question.choices.length!==4))return json({error:"invalid_round_content"},409);const id=crypto.randomUUID(),questionOrder=JSON.stringify(questions.map(question=>question.id));
  try{await env.DB.prepare("INSERT INTO attempts (id,user_id,round_id,attempt_number,mode,status,shuffle_seed,question_order_json,started_at) VALUES (?1,?2,?3,?4,?5,'in_progress',?6,?7,?8)").bind(id,user.id,roundId,attemptNumber,mode,seed,questionOrder,now).run()}catch{const winner:any=await env.DB.prepare("SELECT * FROM attempts WHERE user_id=?1 AND round_id=?2 AND mode=?3 AND status='in_progress' ORDER BY started_at DESC LIMIT 1").bind(user.id,roundId,mode).first();if(winner){const validQuestions=await hydrate(env,roundId,winner.shuffle_seed,winner.question_order_json),progress:any=await env.DB.prepare("SELECT COUNT(*) answered,COALESCE(SUM(points),0) score,MAX(answered_at) lastAnsweredAt FROM attempt_answers WHERE attempt_id=?1").bind(winner.id).first(),base=Number(progress?.lastAnsweredAt||winner.started_at),remaining=Math.max(0,Number(round.seconds_per_question)-Math.floor((Date.now()-base)/1000));return json({attempt:{id:winner.id,attemptNumber:winner.attempt_number,mode,secondsPerQuestion:round.seconds_per_question,questions:validQuestions,resumed:true,nextIndex:Number(progress?.answered||0),score:Number(progress?.score||0),remainingSeconds:remaining,graceDeadline:attemptGraceDeadline(Number(round.closes_at))}})}return json({error:"attempt_conflict"},409)}
  return json({attempt:{id,attemptNumber,mode,secondsPerQuestion:round.seconds_per_question,questions,graceDeadline:attemptGraceDeadline(Number(round.closes_at))}},201);
}catch(response){if(response instanceof Response)return response;throw response;}};
