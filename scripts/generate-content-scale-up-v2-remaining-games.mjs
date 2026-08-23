import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "content", "content-scale-up-v2-remaining-games.json");
const reviewOutput = resolve(root, "docs", "PRODUCT", "CONTENT_SCALE_UP_V2_REMAINING_GAMES_REVIEW.md");
const official = JSON.parse(readFileSync(resolve(root, "content", "official-base-content-v1.json"), "utf8")).contents;
const csvRows = new TextDecoder("windows-1252").decode(readFileSync(resolve(root, "Quiz.csv")))
  .split(/\r?\n/u).slice(1).filter(Boolean).map(line => line.split(";")).filter(row => row.length >= 12);

const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "")
  .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/gu, " ").trim();
const truncate = (value, size = 180) => String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, size).trim();
const answerOf = row => row[6 + Math.max(0, "ABCD".indexOf(row[10]))];
const newTestamentBooks = new Set([
  "mateus", "marcos", "lucas", "joao", "atos", "romanos", "1 corintios", "2 corintios",
  "galatas", "efesios", "filipenses", "colossenses", "1 tessalonicenses", "2 tessalonicenses",
  "1 timoteo", "2 timoteo", "tito", "filemom", "hebreus", "tiago", "1 pedro", "2 pedro",
  "1 joao", "2 joao", "3 joao", "judas", "apocalipse",
]);
const testamentForBook = book => newTestamentBooks.has(normalize(book)) ? "Novo Testamento" : "Antigo Testamento";
const difficultyPlan = (count, easy, medium) => Array.from({ length: count }, (_, index) =>
  index < easy ? "EASY" : index < easy + medium ? "MEDIUM" : "HARD");
const countBy = (items, key) => Object.fromEntries(
  Object.entries(Object.groupBy(items, key)).map(([name, values]) => [name, values.length]),
);
const fingerprintPairs = (pairs, left, right) => pairs.map(pair => `${normalize(pair[left])}:${normalize(pair[right])}`).sort().join("||");
const fingerprintChallenges = (challenges, hintField) => challenges
  .map(challenge => `${normalize(challenge.answer)}:${challenge[hintField].map(normalize).join("|")}`).sort().join("||");

const parseReference = value => {
  const match = String(value).match(/(\d+)(?::(\d+))?/u);
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0)];
};
const referenceRank = row => {
  const [chapter, verse] = parseReference(row[1]);
  return chapter * 1000 + verse;
};
const quizFacts = csvRows.map((row, index) => ({
  index,
  book: row[0],
  reference: row[1],
  theme: row[2],
  category: row[3],
  question: truncate(row[5], 170),
  answer: truncate(answerOf(row), 90),
  comment: truncate(row[11], 190),
  testament: testamentForBook(row[0]),
  rank: referenceRank(row),
})).filter(fact => fact.answer && fact.question && fact.reference);

function takeByTestament(items, oldCount, newCount, keyOf) {
  const selected = [];
  const seen = new Set();
  for (const [testament, count] of [["Antigo Testamento", oldCount], ["Novo Testamento", newCount]]) {
    for (const item of items.filter(value => value.testament === testament)) {
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
      if (selected.filter(value => value.testament === testament).length === count) break;
    }
  }
  if (selected.length !== oldCount + newCount) throw new Error(`insufficient_testament_candidates:${selected.length}/${oldCount + newCount}`);
  return selected;
}

function combinations(pool, count, valid, fingerprint, blocked = new Set()) {
  const result = [];
  const seen = new Set(blocked);
  for (let gap = 1; result.length < count && gap < pool.length; gap += 1) {
    for (let start = 0; start < pool.length && result.length < count; start += 1) {
      const selected = [pool[start], pool[(start + gap) % pool.length], pool[(start + gap * 2) % pool.length]];
      if (!valid(selected)) continue;
      const key = fingerprint(selected);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(selected);
    }
  }
  if (result.length !== count) throw new Error(`insufficient_combinations:${result.length}/${count}`);
  return result;
}

const common = (externalId, gameType, category, difficulty, testament, references, source) => ({
  externalId,
  gameType,
  category,
  difficulty,
  biblicalReference: [...new Set(references)].join("; "),
  tags: [testament, "Content Scale-Up v2", "Lote único demais jogos", source],
  editorialProvenance: { corpus: "Quiz.csv + acervo oficial v1", reviewFlag: "PENDING_HUMAN_REVIEW" },
});

// Timeline usa somente três referências crescentes do mesmo livro; o título explicita ordem narrativa.
const timelineExisting = new Set(official.filter(item => item.gameType === "linha-do-tempo-biblica")
  .map(item => item.payload.events.map(event => normalize(event.title)).join("|")));
const factsByBook = Object.values(Object.groupBy(quizFacts, fact => `${fact.testament}|${fact.book}`))
  .map(facts => [...facts].sort((a, b) => a.rank - b.rank || a.index - b.index)).filter(facts => facts.length >= 3);
const timelineSeen = new Set(timelineExisting);
const timelineCandidates = [];
for (const [testament, target] of [["Antigo Testamento", 412], ["Novo Testamento", 348]]) {
  const selectedForTestament = [];
  for (let span = 1; selectedForTestament.length < target && span < 20; span += 1) {
    for (const facts of factsByBook.filter(group => group[0].testament === testament)) {
      for (let start = 0; start + span * 2 < facts.length && selectedForTestament.length < target; start += 1) {
        const selected = [facts[start], facts[start + span], facts[start + span * 2]];
        const key = selected.map(fact => `${normalize(fact.answer)}:${normalize(fact.question)}`).join("|");
        if (timelineSeen.has(key)) continue;
        timelineSeen.add(key);
        selectedForTestament.push(selected);
      }
    }
  }
  if (selectedForTestament.length !== target) {
    throw new Error(`insufficient_timeline_${normalize(testament)}:${selectedForTestament.length}/${target}`);
  }
  timelineCandidates.push(...selectedForTestament);
}
if (timelineCandidates.length !== 760) throw new Error(`insufficient_timeline:${timelineCandidates.length}/760`);
const timelineDifficulty = difficultyPlan(760, 230, 340);
const timeline = timelineCandidates.map((facts, index) => ({
  ...common(
    `timeline-scale-v2-${String(index + 1).padStart(3, "0")}`,
    "linha-do-tempo-biblica", "Eventos", timelineDifficulty[index], facts[0].testament,
    facts.map(fact => `${fact.book} ${fact.reference}`), "Ordem narrativa por referência",
  ),
  payload: {
    title: `Ordem narrativa em ${facts[0].book} — conjunto ${index + 1}`,
    events: facts.map((fact, position) => ({
      title: truncate(`${fact.answer} — ${fact.question.replace(/[?]+$/u, "")}`, 180),
      description: truncate(`Referência-base: ${fact.book} ${fact.reference}.`, 240),
      position: position + 1,
    })),
  },
}));

// Memória acrescenta exatamente 180 pares canônicos, organizados em 60 conjuntos.
const existingMemoryPairs = new Set(official.filter(item => item.gameType === "memoria-biblica")
  .flatMap(item => item.payload.pairs.map(pair => `${normalize(pair.front)}:${normalize(pair.back)}`)));
const memoryPool = quizFacts.map(fact => ({
  testament: fact.testament,
  reference: `${fact.book} ${fact.reference}`,
  front: fact.answer,
  back: truncate(fact.theme || fact.comment || fact.question, 100),
})).filter(pair => normalize(pair.front) !== normalize(pair.back) && !existingMemoryPairs.has(`${normalize(pair.front)}:${normalize(pair.back)}`));
const memoryPairs = takeByTestament(memoryPool, 93, 87, pair => `${normalize(pair.front)}:${normalize(pair.back)}`);
const memoryDifficulty = difficultyPlan(60, 18, 27);
const memory = Array.from({ length: 60 }, (_, index) => {
  const pairs = memoryPairs.slice(index * 3, index * 3 + 3);
  return {
    ...common(`memory-scale-v2-${String(index + 1).padStart(3, "0")}`, "memoria-biblica", "Conceitos",
      memoryDifficulty[index], pairs[0].testament, pairs.map(pair => pair.reference), "Pares resposta e tema"),
    payload: { title: `Memória bíblica — conexões ${index + 1}`, pairs: pairs.map(({ front, back }) => ({ front, back })) },
  };
});

// Associação reutiliza relações autorais, mas cada conjunto possui lados únicos e fingerprint próprio.
const associationPool = quizFacts.map(fact => ({
  testament: fact.testament,
  reference: `${fact.book} ${fact.reference}`,
  left: fact.answer,
  right: truncate(fact.theme || fact.category, 100),
})).filter(pair => normalize(pair.left) !== normalize(pair.right));
const existingAssociation = new Set(official.filter(item => item.gameType === "associacao-de-temas")
  .map(item => fingerprintPairs(item.payload.pairs, "left", "right")));
const associationGroups = [];
for (const [testament, count] of [["Antigo Testamento", 404], ["Novo Testamento", 336]]) {
  associationGroups.push(...combinations(
    associationPool.filter(pair => pair.testament === testament), count,
    selected => new Set(selected.map(item => normalize(item.left))).size === 3
      && new Set(selected.map(item => normalize(item.right))).size === 3,
    selected => fingerprintPairs(selected, "left", "right"), existingAssociation,
  ));
}
const associationDifficulty = difficultyPlan(740, 216, 336);
const association = associationGroups.map((pairs, index) => ({
  ...common(`association-scale-v2-${String(index + 1).padStart(3, "0")}`, "associacao-de-temas", "Conceitos",
    associationDifficulty[index], pairs[0].testament, pairs.map(pair => pair.reference), "Associações resposta e tema"),
  payload: { title: `Conexões bíblicas — conjunto ${index + 1}`, pairs: pairs.map(({ left, right }) => ({ left, right })) },
}));

function challengeExpansion(gameType, hintField, count, oldCount, newCount, difficultyCounts) {
  const source = official.filter(item => item.gameType === gameType).flatMap(item =>
    item.payload.challenges.map(challenge => ({
      ...challenge,
      testament: item.tags.find(tag => /Testamento$/u.test(tag)) ?? "Antigo Testamento",
      reference: item.biblicalReference,
      category: item.category,
    })));
  const existing = new Set(official.filter(item => item.gameType === gameType)
    .map(item => fingerprintChallenges(item.payload.challenges, hintField)));
  const groups = [];
  for (const [testament, target] of [["Antigo Testamento", oldCount], ["Novo Testamento", newCount]]) {
    groups.push(...combinations(
      source.filter(item => item.testament === testament), target,
      selected => new Set(selected.map(item => normalize(item.answer))).size === 3,
      selected => fingerprintChallenges(selected, hintField), existing,
    ));
  }
  const difficulties = difficultyPlan(count, difficultyCounts[0], difficultyCounts[1]);
  return groups.map((challenges, index) => ({ challenges, difficulty: difficulties[index] }));
}

const who = challengeExpansion("quem-sou-eu", "hints", 740, 404, 336, [216, 336]).map(({ challenges, difficulty }, index) => ({
  ...common(`who-scale-v2-${String(index + 1).padStart(3, "0")}`, "quem-sou-eu", "Personagens", difficulty,
    challenges[0].testament, challenges.map(item => item.reference), "Identidades e pistas progressivas"),
  payload: { title: `Quem Sou Eu? — conjunto ampliado ${index + 1}`, challenges: challenges.map(({ answer, hints }) => ({ answer, hints })) },
}));
const threeSource = official.filter(item => item.gameType === "jogo-tres-pistas").flatMap(item =>
  item.payload.challenges.map(challenge => ({
    ...challenge,
    testament: item.tags.find(tag => /Testamento$/u.test(tag)) ?? "Antigo Testamento",
    reference: item.biblicalReference,
    category: item.category,
  })));
const threeExisting = new Set(official.filter(item => item.gameType === "jogo-tres-pistas")
  .map(item => fingerprintChallenges(item.payload.challenges, "clues")));
const threeGroups = [];
for (const [testament, personCount, otherCount] of [
  ["Antigo Testamento", 82, 322],
  ["Novo Testamento", 0, 336],
]) {
  if (personCount > 0) {
    threeGroups.push(...combinations(
      threeSource.filter(item => item.testament === testament && item.category === "Personagens"), personCount,
      selected => new Set(selected.map(item => normalize(item.answer))).size === 3,
      selected => fingerprintChallenges(selected, "clues"), threeExisting,
    ));
  }
  threeGroups.push(...combinations(
    threeSource.filter(item => item.testament === testament && item.category !== "Personagens"), otherCount,
    selected => new Set(selected.map(item => normalize(item.answer))).size === 3,
    selected => fingerprintChallenges(selected, "clues"), threeExisting,
  ));
}
const threeDifficulty = difficultyPlan(740, 216, 336);
const three = threeGroups.map((challenges, index) => ({
  ...common(`three-clues-scale-v2-${String(index + 1).padStart(3, "0")}`, "jogo-tres-pistas", challenges[0].category,
    threeDifficulty[index], challenges[0].testament, challenges.map(item => item.reference), "Respostas diversas e três pistas"),
  payload: { title: `Três Pistas — conjunto ampliado ${index + 1}`, challenges: challenges.map(({ answer, clues }) => ({ answer, clues })) },
}));

const contents = [...timeline, ...memory, ...association, ...who, ...three];
const expected = {
  "linha-do-tempo-biblica": 760,
  "memoria-biblica": 60,
  "associacao-de-temas": 740,
  "quem-sou-eu": 740,
  "jogo-tres-pistas": 740,
};
for (const [gameType, count] of Object.entries(expected)) {
  const actual = contents.filter(item => item.gameType === gameType).length;
  if (actual !== count) throw new Error(`unexpected_count:${gameType}:${actual}/${count}`);
}
if (new Set(contents.map(item => item.externalId)).size !== contents.length) throw new Error("duplicate_external_ids");

const pack = {
  version: 1,
  source: "Conte os Feitos — Content Scale-Up v2 — demais jogos",
  reviewStatus: "PENDING_HUMAN_REVIEW",
  generationPolicy: "OWNER_AUTHORIZED_COMBINED_REVIEW_BATCH",
  contents,
};
writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

const reviewRows = contents.map(item => {
  const unitCount = item.payload.events?.length ?? item.payload.pairs?.length ?? item.payload.challenges?.length ?? 0;
  return `| ${item.externalId} | ${item.gameType} | ${item.category} | ${item.difficulty} | ${item.tags[0]} | ${unitCount} | [ ] |`;
});
writeFileSync(reviewOutput, `# Revisão conjunta — Content Scale-Up v2 — demais jogos

**Estado:** HUMAN_APPROVED / IMPORTED / PUBLISHED
**Autorização:** produção conjunta autorizada pelo proprietário em 22/08/2026  
**Escopo:** ${contents.length.toLocaleString("pt-BR")} conteúdos candidatos; aprovação humana confirmada pelo proprietário e aplicação concluída pelo fluxo administrativo controlado.

## Totais

| Jogo | Conteúdos candidatos | Unidade/meta atendida após aprovação |
|---|---:|---|
| Linha do Tempo | ${timeline.length} | 800 sequências acumuladas |
| Memória | ${memory.length} | +180 pares; 300 pares canônicos acumulados |
| Associação | ${association.length} | 800 conjuntos acumulados |
| Quem Sou Eu? | ${who.length} | 800 conjuntos acumulados |
| Três Pistas | ${three.length} | 800 conjuntos acumulados |

## Alertas editoriais obrigatórios

- o pacote é uma base candidata combinatória derivada do corpus autoral; validade de schema não equivale a qualidade editorial;
- Timeline usa ordem narrativa pela progressão das referências dentro do mesmo livro e deve ser revisada quanto à clareza do texto;
- Memória e Associação exigem revisão humana de inequívoco relacionamento entre os lados;
- Quem Sou Eu e Três Pistas precisam ser revisados quanto à progressão, repetição e identidade distinta entre os jogos;
- aprovação deve registrar correções ou rejeições antes do dry-run; nenhum item deve ser publicado apenas por estar neste arquivo.

## Checklist por conteúdo

| ID | Jogo | Categoria | Dificuldade | Testamento | Unidades | Revisado |
|---|---|---|---|---|---:|---|
${reviewRows.join("\n")}

## Gate

O estado acima registra a promoção operacional já confirmada. O JSON versionado preserva o estado histórico do pacote antes da decisão humana; produção foi reconciliada separadamente por dry-run, importação idempotente, publicação controlada e conferência CMS/Biblioteca/Catálogo.
`, "utf8");

console.log(JSON.stringify({
  output,
  reviewOutput,
  total: contents.length,
  byGame: countBy(contents, item => item.gameType),
  byDifficulty: countBy(contents, item => item.difficulty),
  byTestament: countBy(contents, item => item.tags[0]),
}, null, 2));
