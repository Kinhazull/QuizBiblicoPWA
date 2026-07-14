import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function harness(){
  const listeners={},puts=[],deleted=[],stored=new Map(),response={ok:true,type:"basic",clone(){return this}};
  const cache={addAll:async()=>{},put:async(request,value)=>{puts.push(new URL(request.url).pathname);stored.set(request.url,value)}};
  const context={URL,location:{origin:"https://quiz.test"},fetch:async()=>response,caches:{open:async()=>cache,match:async request=>stored.get(request.url),keys:async()=>["conte-os-feitos-v1","conte-os-feitos-v4"],delete:async key=>{deleted.push(key)}},self:{clients:{claim:async()=>{}},skipWaiting(){},addEventListener(type,fn){listeners[type]=fn}}};
  vm.runInNewContext(readFileSync(new URL("../public/sw.js",import.meta.url),"utf8"),context);
  return{listeners,puts,deleted};
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
