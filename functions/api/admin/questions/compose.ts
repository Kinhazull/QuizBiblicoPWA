import type { AppEnv } from "../../../_lib/auth";
import { requirePermission } from "../../../_lib/permissions";
import { json } from "../../../_lib/security";

function shuffle<T>(items:T[]){const copy=[...items];for(let index=copy.length-1;index>0;index--){const random=new Uint32Array(1);crypto.getRandomValues(random);const target=random[0]%(index+1);[copy[index],copy[target]]=[copy[target],copy[index]]}return copy}

export const onRequestPost=async({request,env}:{request:Request;env:AppEnv})=>{try{
 const admin:any=await requirePermission(request,env,"rounds.manage");const body:any=await request.json();const count=Math.max(1,Math.min(10,Number(body.count)||10));
 const filters=["organization_id=?1","status='active'","review_status='approved'"];const values:any[]=[admin.organizationId];
 for(const [field,column] of [["theme","theme"],["book","book"],["category","category"],["difficulty","difficulty"]]){const value=String(body[field]||"").trim();if(value){values.push(value);filters.push(`${column}=?${values.length}`)}}
 const excluded=Array.isArray(body.excludeIds)?body.excludeIds.map(String).filter(Boolean).slice(0,10):[];if(excluded.length){const positions=excluded.map(id=>{values.push(id);return`?${values.length}`});filters.push(`id NOT IN (${positions.join(",")})`)}
 const candidates=await env.DB.prepare(`SELECT * FROM question_bank WHERE ${filters.join(" AND ")} ORDER BY times_used ASC, updated_at DESC LIMIT 200`).bind(...values).all();
 const selected=shuffle(candidates.results).slice(0,count) as any[];if(!selected.length)return json({questions:[],requested:count,available:0,missing:count});
 const placeholders=selected.map((_,index)=>`?${index+1}`).join(",");const choices=await env.DB.prepare(`SELECT * FROM question_bank_choices WHERE question_id IN (${placeholders}) ORDER BY question_id,position`).bind(...selected.map(item=>item.id)).all();
 const questions=selected.map(item=>{const own=(choices.results as any[]).filter(choice=>choice.question_id===item.id);return{bankQuestionId:item.id,reference:item.reference||"",book:item.book||"",theme:item.theme,category:item.category||"",difficulty:item.difficulty,prompt:item.prompt,commentary:item.commentary||"",choices:own.map(choice=>choice.text),correctIndex:Math.max(0,own.findIndex(choice=>choice.correct))}});
 return json({questions,requested:count,available:candidates.results.length,missing:Math.max(0,count-questions.length)});
}catch(response){if(response instanceof Response)return response;throw response}};
