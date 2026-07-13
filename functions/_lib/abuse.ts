import type{AppEnv}from"./auth";import{sha256}from"./security";
export async function requestFingerprint(request:Request){const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';return sha256(ip.trim())}
export async function enforceRateLimit(env:AppEnv,key:string,limit:number,windowMs:number){
 const now=Date.now(),row:any=await env.DB.prepare(`INSERT INTO abuse_counters(counter_key,hits,window_started_at,blocked_until,updated_at) VALUES(?1,1,?2,NULL,?2) ON CONFLICT(counter_key) DO UPDATE SET hits=CASE WHEN ?2-window_started_at>=?3 THEN 1 ELSE hits+1 END,window_started_at=CASE WHEN ?2-window_started_at>=?3 THEN ?2 ELSE window_started_at END,blocked_until=CASE WHEN ?2-window_started_at>=?3 THEN NULL WHEN blocked_until>?2 THEN blocked_until WHEN hits+1>?4 THEN ?2+?3 ELSE NULL END,updated_at=?2 RETURNING hits,blocked_until`).bind(key,now,windowMs,limit).first();
 if(Math.random()<.02)await env.DB.prepare("DELETE FROM abuse_counters WHERE updated_at<?1").bind(now-7*86400000).run();
 return Number(row?.blocked_until||0)>now?Math.ceil((Number(row.blocked_until)-now)/1000):0;
}
export function strongEnough(password:string){if(password.length<10||password.length>128)return false;const normalized=password.toLowerCase().replace(/[^a-z0-9]/g,'');return !['12345678','password','senha123','qwerty123','admin123','jesus123','1234567890'].includes(normalized)}
