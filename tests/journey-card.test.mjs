import assert from "node:assert/strict";
import test from "node:test";
import { getJourneyCardView } from "../app/journey-card-state.ts";

const current={id:"j1",title:"Milagres de Jesus",theme:"Fé e milagres",opensAt:1,closesAt:999999,attemptLimit:3,secondsPerQuestion:20,practiceAllowed:true};
const remaining=()=>"02h 10min";
const view=(extra={})=>getJourneyCardView({current,completion:{attemptsUsed:0,completed:false,optionalAttemptsRemaining:3,bestScore:0},practice:{completed:0,inProgress:false},...extra},remaining);

test("card da Jornada cobre estados oficiais e ação dinâmica",()=>{
  assert.equal(view().action,"INICIAR JORNADA");
  assert.equal(view({completion:{attemptsUsed:1,completed:false,optionalAttemptsRemaining:2,bestScore:0,inProgress:true}}).action,"CONTINUAR JORNADA");
  assert.equal(view({completion:{attemptsUsed:1,completed:true,optionalAttemptsRemaining:2,bestScore:8400}}).action,"MELHORAR RESULTADO");
  assert.equal(getJourneyCardView({next:{id:"j2",title:"Próxima",opensAt:2}},remaining).eyebrow,"PRÓXIMA JORNADA");
  assert.equal(getJourneyCardView({recent:{id:"j0",title:"Encerrada",closesAt:1,bestScore:5000}},remaining).action,"VER RESULTADO");
});

test("card separa Jornada de Treino da competição oficial",()=>{
  const completion={attemptsUsed:3,completed:true,optionalAttemptsRemaining:0,bestScore:9000};
  assert.equal(view({completion,practice:{completed:0,inProgress:true}}).action,"CONTINUAR TREINO");
  assert.equal(view({completion,practice:{completed:1,inProgress:false}}).action,"JOGAR NOVAMENTE");
  assert.equal(view({completion,practice:{completed:0,inProgress:false}}).action,"INICIAR TREINO");
  assert.equal(view({current:{...current,practiceAllowed:false},completion}).action,"VER CLASSIFICAÇÃO");
});
