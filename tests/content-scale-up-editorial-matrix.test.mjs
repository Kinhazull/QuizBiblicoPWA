import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("matriz editorial v2 congela metas e unidades de contagem", async () => {
  const matrix = await read("docs/PRODUCT/CONTENT_SCALE_UP_V2_EDITORIAL_MATRIX.md");
  assert.match(matrix, /Quiz Bíblico \| pergunta CMS publicada \| 984/);
  assert.match(matrix, /Wordle Bíblico \| solução CMS publicada e única \| 1\.200/);
  assert.match(matrix, /Linha do Tempo \| sequência CMS publicada \| 800/);
  assert.match(matrix, /Memória Bíblica \| par canônico único publicado \| 300/);
  assert.match(matrix, /Associação de Temas \| conjunto CMS publicado \| 800/);
  assert.match(matrix, /Quem Sou Eu\? \| conjunto CMS publicado \| 800/);
  assert.match(matrix, /Jogo das 3 Pistas \| conjunto CMS publicado \| 800/);
});

test("Wordle separa soluções CMS do léxico de tentativas", async () => {
  const matrix = await read("docs/PRODUCT/CONTENT_SCALE_UP_V2_EDITORIAL_MATRIX.md");
  assert.match(matrix, /5 letras \| 400/);
  assert.match(matrix, /6 letras \| 400/);
  assert.match(matrix, /7 letras \| 400/);
  assert.match(matrix, /palavra aceita como tentativa não é automaticamente solução elegível/i);
});

test("matriz preserva identidades editoriais e publicação humana", async () => {
  const matrix = await read("docs/PRODUCT/CONTENT_SCALE_UP_V2_EDITORIAL_MATRIX.md");
  assert.match(matrix, /Quem Sou Eu e Três Pistas não convergem para o mesmo catálogo/);
  assert.match(matrix, /dry-run sem escrita/);
  assert.match(matrix, /confirmação administrativa explícita/);
  assert.match(matrix, /publicação somente após aprovação humana/);
  assert.match(matrix, /nenhuma alteração de conteúdo, schema, migration ou runtime foi realizada/i);
});
