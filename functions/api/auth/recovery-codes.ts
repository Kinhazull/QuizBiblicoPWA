import { requireUser, type AppEnv } from "../../_lib/auth";
import { json, randomToken, sha256, verifyPassword } from "../../_lib/security";

export const onRequestPost=async({request,env}:{request:Request;env:AppEnv})=>{try{
  const user:any=await requireUser(request,env),body:any=await request.json();
  const credential:any=await env.DB.prepare("SELECT password_hash,password_salt FROM users WHERE id=?1").bind(user.id).first();
  if(!credential||!await verifyPassword(String(body.password||''),credential.password_salt,credential.password_hash))return json({error:'invalid_password'},403);
  const codes=Array.from({length:6},()=>`${randomToken(5).slice(0,5)}-${randomToken(5).slice(0,5)}`.toUpperCase()),now=Date.now();
  const statements:D1PreparedStatement[]=[env.DB.prepare("DELETE FROM account_recovery_codes WHERE user_id=?1").bind(user.id)];
  for(const code of codes)statements.push(env.DB.prepare("INSERT INTO account_recovery_codes (id,user_id,code_hash,created_at) VALUES (?1,?2,?3,?4)").bind(crypto.randomUUID(),user.id,await sha256(code),now));
  statements.push(env.DB.prepare("INSERT INTO audit_logs (id,organization_id,actor_user_id,action,entity_type,entity_id,details_json,created_at) VALUES (?1,?2,?3,'recovery_codes.generated','user',?3,?4,?5)").bind(crypto.randomUUID(),user.organizationId,user.id,JSON.stringify({count:codes.length}),now));
  await env.DB.batch(statements);return json({codes,warning:'Guarde estes códigos agora. Eles não serão exibidos novamente.'});
}catch(response){if(response instanceof Response)return response;throw response;}};
