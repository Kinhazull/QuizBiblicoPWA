import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function harness({offline=false}={}){
  const listeners={},puts=[],deleted=[],offlinePage={kind:"offline"},stored=new Map([["/offline.html",offlinePage]]),response={ok:true,type:"basic",headers:{get(){return null}},clone(){return this}};
  const cache={addAll:async()=>{},put:async(request,value)=>{puts.push(new URL(request.url).pathname);stored.set(request.url,value)}};
  const context={URL,location:{origin:"https://quiz.test"},fetch:async()=>{if(offline)throw new Error("offline");return response},caches:{open:async()=>cache,match:async request=>stored.get(typeof request==="string"?request:request.url),keys:async()=>["conte-os-feitos-v1","conte-os-feitos-v5"],delete:async key=>{deleted.push(key)}},self:{clients:{claim:async()=>{}},skipWaiting(){},addEventListener(type,fn){listeners[type]=fn}}};
  vm.runInNewContext(readFileSync(new URL("../public/sw.js",import.meta.url),"utf8"),context);
  return{listeners,puts,deleted,offlinePage};
}

async function dispatchFetch(listeners,path,{mode="cors",method="GET"}={}){
  let responsePromise,work=[];const request={url:`https://quiz.test${path}`,mode,method};
  listeners.fetch({request,respondWith(value){responsePromise=value},waitUntil(value){work.push(value)}});
  if(responsePromise)await responsePromise;await Promise.all(work);return Boolean(responsePromise);
}

test("service worker bypasses private/API/navigation requests and caches only public shell",async()=>{
  const{listeners,puts}=harness();
  for(const path of ["/api/attempts/start","/api/admin/backup","/admin","/perfil","/login"]){await dispatchFetch(listeners,path,{mode:path.startsWith("/api/")?"cors":"navigate"});assert.ok(!puts.includes(path),path)}
  assert.equal(await dispatchFetch(listeners,"/_next/static/app.js"),true);assert.deepEqual(puts,["/_next/static/app.js"]);
  assert.equal(await dispatchFetch(listeners,"/arquivo-privado.json"),false);assert.deepEqual(puts,["/_next/static/app.js"]);
});

test("service worker activation deletes incompatible cache versions",async()=>{
  const{listeners,deleted}=harness();let completion;listeners.activate({waitUntil(value){completion=value}});await completion;assert.deepEqual(deleted,["conte-os-feitos-v1"]);
});

test("offline navigation receives the public friendly fallback without caching private HTML",async()=>{
  const{listeners,puts}=harness({offline:true});let responsePromise;const request={url:"https://quiz.test/jogar",mode:"navigate",method:"GET"};listeners.fetch({request,respondWith(value){responsePromise=value},waitUntil(){}});const result=await responsePromise;assert.equal(result.kind,"offline");assert.deepEqual(puts,[]);
});
