const MAX_API_BODY=2*1024*1024;
export const onRequest=async({request,next}:{request:Request;next:()=>Promise<Response>})=>{
 const url=new URL(request.url),api=url.pathname.startsWith('/api/'),mutation=api&&!['GET','HEAD','OPTIONS'].includes(request.method);
 if(mutation){
  const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
  try{if(origin?new URL(origin).host!==url.host:site!=='same-origin')return new Response(JSON.stringify({error:'invalid_origin'}),{status:403,headers:{'content-type':'application/json'}})}catch{return new Response(JSON.stringify({error:'invalid_origin'}),{status:403,headers:{'content-type':'application/json'}})}
  const length=Number(request.headers.get('content-length')||0);if(length>MAX_API_BODY)return new Response(JSON.stringify({error:'payload_too_large'}),{status:413,headers:{'content-type':'application/json'}});
 }
 let response:Response;try{response=await next()}catch(error){console.error(JSON.stringify({message:'request_failed',method:request.method,path:url.pathname,error:error instanceof Error?error.message:String(error)}));return api?new Response(JSON.stringify({error:'internal_error'}),{status:500,headers:{'content-type':'application/json','cache-control':'no-store'}}):new Response('Erro interno',{status:500})}const headers=new Headers(response.headers);headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','strict-origin-when-cross-origin');headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');headers.set('x-frame-options','DENY');headers.set('content-security-policy',"frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests");if(api&&!headers.has('cache-control'))headers.set('cache-control','no-store, private');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
};
