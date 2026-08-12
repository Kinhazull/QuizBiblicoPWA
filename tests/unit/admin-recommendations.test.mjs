import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_RECOMMENDATION_THRESHOLDS, deriveAdminRecommendations } from "../../functions/_lib/admin-recommendations.ts";

const now = Date.UTC(2026, 7, 11);
const input = (overrides = {}) => ({
  now,
  pendingUsers: 0,
  libraryInsights: [],
  planning: { events: [], summary: { noEventsNext14Days: false }, editorial: { awaitingReview: 0 } },
  operationalGroups: {},
  ...overrides,
});

test("event recommendations are explainable, deterministic and ordered by severity then time", () => {
  const events = [
    { id:"later",title:"Evento posterior",status:"SCHEDULED",startsAt:now+6*86_400_000,coverAssetId:null,rewards:{participationXp:80,victoryCoins:0,completionBonusXp:0,perfectBonusCoins:0},checklist:{ready:false,issues:[{code:"games_required",label:"Selecione ao menos um jogo."}]} },
    { id:"near",title:"Evento próximo",status:"SCHEDULED",startsAt:now+86_400_000,coverAssetId:"asset-off",coverAssetStatus:"INACTIVE",rewards:{participationXp:0,victoryCoins:0,completionBonusXp:0,perfectBonusCoins:0},checklist:{ready:false,issues:[{code:"content_missing:wordle",label:"Falta conteúdo."}]} },
  ];
  const result = deriveAdminRecommendations(input({ planning:{events,summary:{noEventsNext14Days:false},editorial:{awaitingReview:0}} }));
  assert.equal(ADMIN_RECOMMENDATION_THRESHOLDS.highRewardPercentOfMaximum,80);
  assert.equal(result[0].id,"event:asset:near");
  assert.equal(result[1].id,"event:not-ready:near");
  assert.ok(result.some(item=>item.id==="event:reward:later"&&item.reason.includes("80%")));
  assert.ok(result.every(item=>item.calculatedAt===now&&item.entity&&!Object.hasOwn(item,"userId")));
});

test("library causes are reused once and editorial, planning and operations remain human decisions", () => {
  const insight={id:"small_catalog:wordle",rule:"small_catalog",severity:"critical",gameType:"wordle-biblico",title:"Catálogo pequeno",description:"4 conteúdos disponíveis.",recommendation:"Revisar cobertura.",count:4,percentage:null};
  const result=deriveAdminRecommendations(input({pendingUsers:2,libraryInsights:[insight,insight],planning:{events:[],summary:{noEventsNext14Days:true},editorial:{awaitingReview:3}},operationalGroups:{WORKER:{checks:[{status:"DEGRADED",description:"Fila atrasada.",value:1}]}}}));
  assert.equal(result.filter(item=>item.id==="library:small_catalog:wordle").length,1);
  assert.ok(result.some(item=>item.id==="content:awaiting-review"&&item.severity==="ATTENTION"));
  assert.ok(result.some(item=>item.id==="planning:no-event-14d"&&item.severity==="INFO"));
  assert.ok(result.some(item=>item.id==="operations:health:worker"&&item.href==="/admin/diagnostico"));
  assert.ok(result.every(item=>!item.suggestedAction.toLowerCase().includes("automatic")));
});

test("events outside the reliable upcoming window do not create event recommendations", () => {
  const event={id:"future",title:"Futuro",status:"DRAFT",startsAt:now+8*86_400_000,coverAssetId:null,checklist:{ready:false,issues:[{code:"games_required",label:"Sem jogos."}]}};
  const result=deriveAdminRecommendations(input({planning:{events:[event],summary:{noEventsNext14Days:false},editorial:{awaitingReview:0}}}));
  assert.equal(result.length,0);
});
