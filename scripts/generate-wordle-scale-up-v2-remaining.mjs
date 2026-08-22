import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "content", "wordle-scale-up-v2-remaining.json");
const reviewOutput = resolve(root, "docs", "PRODUCT", "WORDLE_SCALE_UP_V2_REMAINING_REVIEW.md");

const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const rows = new TextDecoder("windows-1252")
  .decode(readFileSync(resolve(root, "Quiz.csv")))
  .split(/\r?\n/u)
  .slice(1)
  .filter(Boolean)
  .map(line => line.split(";"));

const previous = [
  ...JSON.parse(readFileSync(resolve(root, "content", "official-base-content-v1.json"), "utf8")).contents,
  ...JSON.parse(readFileSync(resolve(root, "content", "wordle-expansion-v2.json"), "utf8")).contents,
  ...JSON.parse(readFileSync(resolve(root, "content", "wordle-scale-up-v2-lot-01.json"), "utf8")).contents,
].filter(item => item.gameType === "wordle-biblico");
const unavailable = new Set(previous.map(item => normalize(item.payload.word)));

const newTestamentBooks = new Set([
  "MATEUS", "MARCOS", "LUCAS", "JOAO", "ATOS", "ROMANOS", "1 CORINTIOS", "2 CORINTIOS",
  "GALATAS", "EFESIOS", "FILIPENSES", "COLOSSENSES", "1 TESSALONICENSES", "2 TESSALONICENSES",
  "1 TIMOTEO", "2 TIMOTEO", "TITO", "FILEMOM", "HEBREUS", "TIAGO", "1 PEDRO", "2 PEDRO",
  "1 JOAO", "2 JOAO", "3 JOAO", "JUDAS", "APOCALIPSE",
]);

// Palavras gramaticais ou de formulação da pergunta não se tornam boas soluções.
const excluded = new Set(`
ACERCA AGORA AINDA ALGUM ALGUMA ALGUNS APENAS AQUELE AQUELA AQUELES ATRAVES ANTES
COMO DEPOIS DESDE DESTA DESTE DEVEM DISSE DIZER DURANTE ENQUANTO ENTÃO ESTAVA ESTAVAM
FORAM FORMA HAVIA MESMO NESTA NESTE OUTROS OUTRAS PARTE PODEM PORQUE PRIMEIRO QUALQUER
QUANDO QUANTOS SEGUNDO SENDO SERIA SOMENTE SOBRE TAMBEM TINHA TODAS TODOS VEZES
`.trim().split(/\s+/u));

const fieldDefinitions = [
  { name: "answer", priority: 0, value: columns => columns[6 + Math.max(0, "ABCD".indexOf(columns[10]))] },
  { name: "theme", priority: 1, value: columns => columns[2] },
  { name: "category", priority: 2, value: columns => columns[3] },
  { name: "comment", priority: 3, value: columns => columns[11] },
  { name: "question", priority: 4, value: columns => columns[5] },
];

const candidates = new Map();
for (const columns of rows) {
  if (columns.length < 12) continue;
  const testament = newTestamentBooks.has(normalize(columns[0])) ? "Novo Testamento" : "Antigo Testamento";
  for (const field of fieldDefinitions) {
    const sourceText = field.value(columns) ?? "";
    for (const word of normalize(sourceText).split(/[^A-Z]+/u).filter(Boolean)) {
      if (![5, 6, 7].includes(word.length) || unavailable.has(word) || excluded.has(word)) continue;
      const key = `${word}|${testament}`;
      const existing = candidates.get(key);
      const occurrence = {
        word,
        testament,
        field: field.name,
        priority: field.priority,
        book: columns[0],
        biblicalReference: columns[1],
        theme: columns[2],
        sourceCategory: columns[3],
        question: columns[5],
        comment: columns[11],
      };
      if (!existing) candidates.set(key, { ...occurrence, frequency: 1 });
      else {
        existing.frequency += 1;
        if (field.priority < existing.priority) Object.assign(existing, occurrence, { frequency: existing.frequency });
      }
    }
  }
}

const quotas = [
  [5, "Novo Testamento", 90], [5, "Antigo Testamento", 90],
  [6, "Novo Testamento", 175], [6, "Antigo Testamento", 175],
  [7, "Novo Testamento", 174], [7, "Antigo Testamento", 173],
];
const selectedWords = new Set();
const selected = [];
for (const [length, testament, quota] of quotas) {
  const pool = [...candidates.values()]
    .filter(item => item.word.length === length && item.testament === testament && !selectedWords.has(item.word))
    .sort((left, right) => left.priority - right.priority || right.frequency - left.frequency || left.word.localeCompare(right.word, "pt-BR"));
  const chosen = [];
  for (const item of pool) {
    if (selectedWords.has(item.word)) continue;
    chosen.push(item);
    selectedWords.add(item.word);
    if (chosen.length === quota) break;
  }
  if (chosen.length !== quota) throw new Error(`insufficient_candidates:${length}:${testament}:${chosen.length}/${quota}`);
  selected.push(...chosen);
}

const redact = (text, answer) => String(text ?? "")
  .split(/(\p{L}+)/gu)
  .map(token => normalize(token) === answer ? "_____" : token)
  .join("")
  .replace(/\s+/gu, " ")
  .trim();

const categoryFor = item => {
  const context = normalize(`${item.theme} ${item.sourceCategory}`);
  if (/PERSON|APOSTOL|DISCIPUL|MULHER|HOMEM|REI\b|JUIZ/u.test(context)) return "Personagens";
  if (/LUGAR|CIDADE|REGIAO|GEOGRAF|MONTE|RIO\b|TERRA/u.test(context)) return "Lugares";
  if (/LIVRO|CARTA|ESCRIT/u.test(context)) return "Livros";
  if (/PROFEC/u.test(context)) return "Profecias";
  if (/PARABOL/u.test(context)) return "Parábolas";
  if (/MILAGR/u.test(context)) return "Milagres";
  if (/EVENTO|VIAGEM|BATALHA|EXODO|DILUVIO/u.test(context)) return "Eventos";
  return "Conceitos";
};

const ranked = [...selected].sort((left, right) => left.priority - right.priority || right.frequency - left.frequency || left.word.localeCompare(right.word, "pt-BR"));
const difficultyByWord = new Map(ranked.map((item, index) => [item.word, index < 240 ? "EASY" : index < 646 ? "MEDIUM" : "HARD"]));
const contents = selected
  .sort((left, right) => left.word.length - right.word.length || left.word.localeCompare(right.word, "pt-BR"))
  .map((item, index) => {
    const primary = item.field === "answer" ? item.question : item.field === "comment" ? item.comment : item.question;
    const secondary = item.field === "answer" ? item.comment : "";
    const clueParts = [redact(primary, item.word), redact(secondary, item.word)].filter(Boolean);
    const hint = clueParts.join(" ").slice(0, 240).trim();
    if (!hint || normalize(hint).split(/[^A-Z]+/u).includes(item.word)) throw new Error(`unsafe_hint:${item.word}`);
    return {
      externalId: `wordle-scale-v2-rest-${String(index + 1).padStart(3, "0")}-${item.word.toLowerCase()}`,
      gameType: "wordle-biblico",
      category: categoryFor(item),
      difficulty: difficultyByWord.get(item.word),
      biblicalReference: item.biblicalReference,
      tags: [item.testament, "Content Scale-Up v2", "Lote único restante", `${item.word.length} letras`, `Fonte ${item.field}`],
      payload: { word: item.word, hint },
      editorialProvenance: {
        corpus: "Quiz.csv",
        sourceBook: item.book,
        sourceTheme: item.theme,
        sourceField: item.field,
        reviewFlag: item.field === "answer" ? "DIRECT_ANSWER_CONTEXT" : "CONTEXT_DERIVED_REQUIRES_ATTENTION",
      },
    };
  });

if (contents.length !== 877) throw new Error(`unexpected_remaining_size:${contents.length}`);
if (new Set(contents.map(item => item.payload.word)).size !== contents.length) throw new Error("duplicate_remaining_answer");
if (contents.some(item => unavailable.has(item.payload.word))) throw new Error("duplicates_previous_content");

const packageDocument = {
  version: 1,
  source: "Conte os Feitos — Content Scale-Up v2 — Wordle lote único restante",
  reviewStatus: "PENDING_HUMAN_REVIEW",
  generationPolicy: "OWNER_AUTHORIZED_SINGLE_REVIEW_BATCH",
  contents,
};
writeFileSync(output, `${JSON.stringify(packageDocument, null, 2)}\n`, "utf8");

const count = (items, key) => Object.fromEntries(Object.entries(Object.groupBy(items, key)).map(([name, values]) => [name, values.length]));
const byLength = count(contents, item => String(item.payload.word.length));
const byDifficulty = count(contents, item => item.difficulty);
const byTestament = count(contents, item => item.tags[0]);
const byProvenance = count(contents, item => item.editorialProvenance.reviewFlag);
const reviewRows = contents.map(item => [
  item.externalId, item.payload.word, item.biblicalReference, item.category, item.tags[0], item.difficulty,
  item.editorialProvenance.sourceField, item.payload.hint, "[ ]",
].map(value => String(value).replaceAll("|", "\\|")).join(" | "));

writeFileSync(reviewOutput, `# Revisão humana — Wordle Content Scale-Up v2 — lote único restante

**Estado:** PENDING_HUMAN_REVIEW  
**Autorização:** lote único autorizado pelo proprietário em 22/08/2026  
**Escopo:** 877 candidatos; nenhum item é aprovado ou publicado por este arquivo.

## Resultado acumulado pretendido

| Comprimento | Anteriores aprovados | Neste lote | Total após aprovação | Meta |
|---|---:|---:|---:|---:|
| 5 letras | 220 | ${byLength[5]} | ${220 + byLength[5]} | 400 |
| 6 letras | 50 | ${byLength[6]} | ${50 + byLength[6]} | 400 |
| 7 letras | 53 | ${byLength[7]} | ${53 + byLength[7]} | 400 |

- dificuldade do lote: ${JSON.stringify(byDifficulty)};
- Testamentos do lote: ${JSON.stringify(byTestament)};
- proveniência: ${JSON.stringify(byProvenance)};
- fonte autoral: Quiz.csv; nenhuma Bíblia integral ou serviço remoto foi consultado;
- itens derivados de contexto exigem atenção especial: a presença no corpus não garante, sozinha, que a palavra seja uma boa solução Wordle.

## Checklist obrigatório do revisor

- [ ] palavra natural e reconhecível em português do Brasil;
- [ ] solução relevante ao contexto bíblico, não apenas palavra gramatical da pergunta;
- [ ] referência e dica sustentam especificamente a solução;
- [ ] dica inequívoca, natural e sem resposta direta;
- [ ] categoria, dificuldade e Testamento adequados;
- [ ] rejeitar flexões estranhas, termos vagos e candidatos dependentes de tradução;
- [ ] decisão registrada para os 877 itens antes de qualquer importação.

## Itens

| ID | Solução | Referência | Categoria | Testamento | Dificuldade | Origem | Dica | Revisado |
|---|---|---|---|---|---|---|---|---|
${reviewRows.map(row => `| ${row} |`).join("\n")}

## Gate

O lote permanece integralmente PENDING_HUMAN_REVIEW. Aprovação, correção ou rejeição são decisões humanas. Dry-run, importação e publicação pertencem à etapa controlada 27.7.5B.7.
`, "utf8");

console.log(JSON.stringify({ output, reviewOutput, total: contents.length, byLength, byDifficulty, byTestament, byProvenance }, null, 2));
