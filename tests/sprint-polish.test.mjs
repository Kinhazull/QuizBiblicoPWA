import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("visualização de senha é global, acessível e persistente em telas dinâmicas",async()=>{const[source,layout]=await Promise.all([read("app/PasswordVisibility.tsx"),read("app/layout.tsx")]);assert.match(source,/MutationObserver/);assert.match(source,/aria-pressed/);assert.match(source,/Mostrar senha/);assert.match(source,/Ocultar senha/);assert.match(layout,/<PasswordVisibility/)});

test("novas Jornadas usam duas tentativas por padrão e permitem configuração maior",async()=>{const[handler,form]=await Promise.all([read("functions/api/admin/rounds.ts"),read("app/admin/rodadas/page.tsx")]);assert.match(handler,/officialAttemptLimit\?\?2/);assert.match(form,/officialAttemptLimit[^\n]+defaultValue="2"/);assert.match(form,/max="5"/)});

test("card exibe tema, resultado, colocação, tempo e ação fora do painel",async()=>{const[source,status]=await Promise.all([read("app/JourneyCard.tsx"),read("functions/api/rounds/status.ts")]);for(const label of ["Tema da Jornada","Melhor resultado","Sua colocação","segundos","Encerra em"])assert.ok(source.includes(label),label);assert.match(source,/<\/section>\s*<a className=/);assert.match(status,/RANK\(\) OVER/);assert.match(status,/provisional: Boolean\(current\)/)});

test("card distingue disponível, andamento, resultado registrado e treino",async()=>{const[source,state]=await Promise.all([read("app/JourneyCard.tsx"),read("app/journey-card-state.ts")]);for(const label of ["JORNADA OFICIAL DISPONÍVEL","JORNADA EM ANDAMENTO","RESULTADO REGISTRADO","JORNADA DE TREINO"])assert.ok(state.includes(label),label);assert.match(source,/view\.tone !== "training"/);assert.match(source,/Resultado final/)});

test("aviso de classificação final usa status integrado ao card",async()=>{const[source,css]=await Promise.all([read("app/JourneyCard.tsx"),read("app/globals.css")]);assert.match(source,/className="journey-card-meta" role="status"/);assert.match(css,/\.journey-card-meta\{display:flex;align-items:center/)});

test("card não mistura resultado anterior e flexiona tentativas",async()=>{const[source,state]=await Promise.all([read("app/JourneyCard.tsx"),read("app/journey-card-state.ts")]);assert.match(source,/current && !completion\?\.completed \? "Ainda não classificado"/);assert.match(source,/Ainda não classificado/);assert.match(state,/1 tentativa oficial disponível/);assert.match(state,/tentativas oficiais disponíveis/)});
