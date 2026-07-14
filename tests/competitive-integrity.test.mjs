import assert from "node:assert/strict";
import test from "node:test";
import { validateQuestionResult, normalizeQuestion } from "../functions/_lib/questions.ts";
import { calculateAnswerPoints, summarizeAnswers } from "../functions/_lib/scoring.ts";
const valid={prompt:"Qual foi o primeiro milagre de Jesus?",choices:["Água em vinho","Pães","Cura","Tempestade"],correctIndex:0,theme:"Milagres",difficulty:"medium"};
test("strict question validation",()=>{assert.equal(validateQuestionResult(valid).ok,true);assert.equal(validateQuestionResult({...valid,choices:["A","A ","B","C"]}).ok,false);assert.equal(validateQuestionResult({...valid,choices:valid.choices.slice(0,3)}).ok,false);assert.equal(validateQuestionResult({...valid,correctIndex:"0"}).ok,false);assert.equal(normalizeQuestion("  AÇÃO   de Deus "),"ação de deus")});
test("deterministic server scoring",()=>{assert.equal(calculateAnswerPoints({correct:false,elapsedMs:-20,secondsPerQuestion:20,currentStreak:99}),0);assert.ok(calculateAnswerPoints({correct:true,elapsedMs:1000,secondsPerQuestion:20,currentStreak:1})>calculateAnswerPoints({correct:true,elapsedMs:19000,secondsPerQuestion:20,currentStreak:1}));assert.deepEqual(summarizeAnswers([{correct:1,points:100,response_time_ms:500},{correct:0,points:0,response_time_ms:700}]),{score:100,correctAnswers:1,totalTimeMs:1200,maxStreak:1})});
