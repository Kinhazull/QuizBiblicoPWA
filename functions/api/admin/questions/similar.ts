import type{AppEnv}from"../../../_lib/auth";import{requireAnyPermission}from"../../../_lib/permissions";import{json}from"../../../_lib/security";
const ignored=new Set(['qual','quais','quem','como','onde','quando','sobre','segundo','depois','antes','para','com','uma','que','foi','era','dos','das','por']);
const words=(s:string)=>new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!ignored.has(w)));
const score=(a:Set<string>,b:Set<string>)=>{const both=[...a].filter(x=>b.has(x)).length,all=new Set([...a,...b]).size;return all?both/all:0};
export const onRequestGet=async({request,env}:{request:Request;env:AppEnv})=>{try{
 const user:any=await requireAnyPermission(request,env,['questions.edit','questions.review']),rows=await env.DB.prepare("SELECT id,prompt,reference,theme FROM question_bank WHERE organization_id=?1 AND status<>'archived' ORDER BY updated_at DESC LIMIT 600").bind(user.organizationId).all(),items=rows.results as any[],sets=items.map(item=>words(item.prompt)),index=new Map<string,number[]>();
 sets.forEach((set,i)=>set.forEach(word=>{const list=index.get(word)||[];list.push(i);index.set(word,list)}));const candidates=new Set<string>();
 for(const list of index.values())for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++)candidates.add(`${list[a]}:${list[b]}`);
 const pairs:any[]=[];for(const key of candidates){const[i,j]=key.split(':').map(Number),similarity=score(sets[i],sets[j]);if(similarity>=.72)pairs.push({first:items[i],second:items[j],similarity:Math.round(similarity*100)})}
 pairs.sort((a,b)=>b.similarity-a.similarity);return json({pairs:pairs.slice(0,100),scanned:items.length,comparisons:candidates.size});
}catch(response){if(response instanceof Response)return response;throw response;}};
