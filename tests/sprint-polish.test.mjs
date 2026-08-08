import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("visualização de senha é global, acessível e persistente em telas dinâmicas",async()=>{const[source,layout]=await Promise.all([read("app/PasswordVisibility.tsx"),read("app/layout.tsx")]);assert.match(source,/MutationObserver/);assert.match(source,/aria-pressed/);assert.match(source,/Mostrar senha/);assert.match(source,/Ocultar senha/);assert.match(layout,/<PasswordVisibility/)});

test("administração histórica de Jornadas permanece fora da navegação ativa",async()=>{const[handler,form,navigation]=await Promise.all([read("functions/api/admin/rounds.ts"),read("app/admin/rodadas/page.tsx"),read("app/navigation.tsx")]);assert.match(handler,/officialAttemptLimit\?\?2/);assert.match(form,/officialAttemptLimit[^\n]+defaultValue="2"/);assert.doesNotMatch(navigation,/\/admin\/rodadas|Gerenciar jornadas|Nova jornada/)});
