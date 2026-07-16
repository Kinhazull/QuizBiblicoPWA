import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("melhor tentativa é centralizada e preserva uma linha real",async()=>{const source=await read("functions/_lib/ranking.ts");assert.match(source,/ROW_NUMBER\(\) OVER/);assert.match(source,/PARTITION BY a\.round_id,a\.user_id/);assert.match(source,/a\.score DESC,a\.correct_answers DESC,a\.total_time_ms ASC/);assert.doesNotMatch(source,/MAX\(a\.score\).*MAX\(a\.correct_answers\)/s)});

test("Worker possui fechamento automático idempotente configurado",async()=>{const[worker,vite,processor,migration]=await Promise.all([read("worker/index.ts"),read("vite.config.ts"),read("functions/_lib/round-awards.ts"),read("drizzle/0019_round_award_processing.sql")]);assert.match(worker,/async scheduled/);assert.match(worker,/processClosedRoundAwards/);assert.match(vite,/crons: \["\*\/5 \* \* \* \*"\]/);assert.match(processor,/INSERT OR IGNORE INTO round_award_processing/);assert.match(migration,/round_id TEXT PRIMARY KEY/)});
