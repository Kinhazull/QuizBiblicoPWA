import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OFFICIAL_PATH = resolve(ROOT, "content", "official-base-content-v1.json");
const WORDLE_PATH = resolve(ROOT, "content", "wordle-expansion-v2.json");
const WORDLE_LOT_01_PATH = resolve(ROOT, "content", "wordle-scale-up-v2-lot-01.json");
const WORDLE_REMAINING_PATH = resolve(ROOT, "content", "wordle-scale-up-v2-remaining.json");
const REMAINING_GAMES_PATH = resolve(ROOT, "content", "content-scale-up-v2-remaining-games.json");
const QUIZ_PATH = resolve(ROOT, "Quiz.csv");
const REPORT_PATH = resolve(ROOT, "docs", "PRODUCT", "CONTENT_SCALE_UP_V2_INVENTORY.md");

const GAME = Object.freeze({
  WORDLE: "wordle-biblico",
  TIMELINE: "linha-do-tempo-biblica",
  MEMORY: "memoria-biblica",
  ASSOCIATION: "associacao-de-temas",
  WHO: "quem-sou-eu",
  THREE: "jogo-tres-pistas",
});

const TARGETS = Object.freeze({
  quiz: 984,
  [GAME.WORDLE]: 1200,
  [GAME.TIMELINE]: 800,
  [GAME.MEMORY]: 300,
  [GAME.ASSOCIATION]: 800,
  [GAME.WHO]: 800,
  [GAME.THREE]: 800,
});

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const wordLength = (value) => normalize(value).replace(/[^a-z]/g, "").length;
const countBy = (items, keyOf) => Object.fromEntries(
  Object.entries(Object.groupBy(items, keyOf))
    .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
    .map(([key, values]) => [key, values.length]),
);
const unique = (values) => new Set(values).size;
const percent = (value, total) => total ? `${(value * 100 / total).toFixed(1)}%` : "0.0%";

const pairKey = (left, right) => `${normalize(left)}|${normalize(right)}`;
const challengeKey = (challenge, field) => [
  normalize(challenge.answer),
  ...(challenge[field] ?? []).map(normalize),
].join("|");

const contentFingerprint = (item) => {
  const payload = item.payload;
  switch (item.gameType) {
    case GAME.WORDLE:
      return normalize(payload.word);
    case GAME.TIMELINE:
      return payload.events.map(event => `${event.position}:${normalize(event.title)}:${normalize(event.description)}`).join("|");
    case GAME.MEMORY:
      return payload.pairs.map(pair => pairKey(pair.front, pair.back)).sort().join("||");
    case GAME.ASSOCIATION:
      return payload.pairs.map(pair => pairKey(pair.left, pair.right)).sort().join("||");
    case GAME.WHO:
      return payload.challenges.map(challenge => challengeKey(challenge, "hints")).sort().join("||");
    case GAME.THREE:
      return payload.challenges.map(challenge => challengeKey(challenge, "clues")).sort().join("||");
    default:
      return normalize(item.externalId);
  }
};

const distribution = (items) => ({
  difficulty: countBy(items, item => item.difficulty ?? "UNKNOWN"),
  testament: countBy(items, item => item.tags?.find(tag => /Testamento$/u.test(tag)) ?? "Não classificado"),
  category: countBy(items, item => item.category ?? "Não classificado"),
});

export async function buildInventory() {
  const [officialRaw, wordleRaw, wordleLot01Raw, wordleRemainingRaw, remainingGamesRaw, quizRaw] = await Promise.all([
    readFile(OFFICIAL_PATH, "utf8"),
    readFile(WORDLE_PATH, "utf8"),
    readFile(WORDLE_LOT_01_PATH, "utf8"),
    readFile(WORDLE_REMAINING_PATH, "utf8"),
    readFile(REMAINING_GAMES_PATH, "utf8"),
    readFile(QUIZ_PATH, "utf8"),
  ]);
  const official = JSON.parse(officialRaw).contents;
  const wordleExpansion = JSON.parse(wordleRaw).contents;
  const wordleLot01 = JSON.parse(wordleLot01Raw).contents;
  const wordleRemaining = JSON.parse(wordleRemainingRaw).contents;
  const remainingGamesPack = JSON.parse(remainingGamesRaw);
  const remainingGames = remainingGamesPack.contents;
  const byGame = Object.groupBy(official, item => item.gameType);
  const wordles = [...(byGame[GAME.WORDLE] ?? []), ...wordleExpansion, ...wordleLot01];
  const projectedWordles = [...wordles, ...wordleRemaining];
  const timelines = byGame[GAME.TIMELINE] ?? [];
  const memories = byGame[GAME.MEMORY] ?? [];
  const associations = byGame[GAME.ASSOCIATION] ?? [];
  const who = byGame[GAME.WHO] ?? [];
  const three = byGame[GAME.THREE] ?? [];

  const memoryPairs = memories.flatMap(item => item.payload.pairs.map(pair => pairKey(pair.front, pair.back)));
  const associationPairs = associations.flatMap(item => item.payload.pairs.map(pair => pairKey(pair.left, pair.right)));
  const timelineEvents = timelines.flatMap(item => item.payload.events.map(event => normalize(event.title)));
  const whoChallenges = who.flatMap(item => item.payload.challenges.map(challenge => challengeKey(challenge, "hints")));
  const threeChallenges = three.flatMap(item => item.payload.challenges.map(challenge => challengeKey(challenge, "clues")));
  const whoAnswers = who.flatMap(item => item.payload.challenges.map(challenge => normalize(challenge.answer)));
  const threeAnswers = three.flatMap(item => item.payload.challenges.map(challenge => normalize(challenge.answer)));
  const whoSet = new Set(whoChallenges);
  const memorySet = new Set(memoryPairs);

  const games = {
    [GAME.WORDLE]: {
      unit: "soluções únicas",
      sourceItems: wordles.length,
      canonicalUnits: unique(wordles.map(item => normalize(item.payload.word))),
      target: TARGETS[GAME.WORDLE],
      distribution: distribution(wordles),
      lengths: countBy(wordles, item => String(wordLength(item.payload.word))),
      exactDuplicateItems: wordles.length - unique(wordles.map(contentFingerprint)),
    },
    [GAME.TIMELINE]: {
      unit: "sequências CMS",
      sourceItems: timelines.length,
      canonicalUnits: unique(timelines.map(contentFingerprint)),
      atomicUnits: timelineEvents.length,
      uniqueAtomicUnits: unique(timelineEvents),
      target: TARGETS[GAME.TIMELINE],
      distribution: distribution(timelines),
      exactDuplicateItems: timelines.length - unique(timelines.map(contentFingerprint)),
    },
    [GAME.MEMORY]: {
      unit: "pares canônicos únicos",
      sourceItems: memories.length,
      canonicalUnits: unique(memoryPairs),
      atomicUnits: memoryPairs.length,
      target: TARGETS[GAME.MEMORY],
      distribution: distribution(memories),
      exactDuplicateItems: memories.length - unique(memories.map(contentFingerprint)),
    },
    [GAME.ASSOCIATION]: {
      unit: "conjuntos CMS",
      sourceItems: associations.length,
      canonicalUnits: unique(associations.map(contentFingerprint)),
      atomicUnits: associationPairs.length,
      uniqueAtomicUnits: unique(associationPairs),
      target: TARGETS[GAME.ASSOCIATION],
      distribution: distribution(associations),
      exactDuplicateItems: associations.length - unique(associations.map(contentFingerprint)),
    },
    [GAME.WHO]: {
      unit: "conjuntos CMS",
      sourceItems: who.length,
      canonicalUnits: unique(who.map(contentFingerprint)),
      atomicUnits: whoChallenges.length,
      uniqueAnswers: unique(whoAnswers),
      target: TARGETS[GAME.WHO],
      distribution: distribution(who),
      exactDuplicateItems: who.length - unique(who.map(contentFingerprint)),
    },
    [GAME.THREE]: {
      unit: "conjuntos CMS",
      sourceItems: three.length,
      canonicalUnits: unique(three.map(contentFingerprint)),
      atomicUnits: threeChallenges.length,
      uniqueAnswers: unique(threeAnswers),
      target: TARGETS[GAME.THREE],
      distribution: distribution(three),
      exactDuplicateItems: three.length - unique(three.map(contentFingerprint)),
    },
  };

  for (const game of Object.values(games)) game.gap = Math.max(0, game.target - game.canonicalUnits);

  const projectedByGame = Object.fromEntries(Object.entries(Object.groupBy(remainingGames, item => item.gameType))
    .map(([gameType, candidates]) => {
      const approved = byGame[gameType] ?? [];
      if (gameType === GAME.MEMORY) {
        const pairs = [...approved, ...candidates].flatMap(item => item.payload.pairs.map(pair => pairKey(pair.front, pair.back)));
        return [gameType, { candidateContents: candidates.length, canonicalUnits: unique(pairs) }];
      }
      return [gameType, {
        candidateContents: candidates.length,
        canonicalUnits: unique([...approved, ...candidates].map(contentFingerprint)),
      }];
    }));

  return {
    generatedFrom: [
      "Quiz.csv",
      "content/official-base-content-v1.json",
      "content/wordle-expansion-v2.json",
      "content/wordle-scale-up-v2-lot-01.json",
      "content/wordle-scale-up-v2-remaining.json",
      "content/content-scale-up-v2-remaining-games.json",
    ],
    quiz: {
      authoredCsvRows: Math.max(0, quizRaw.split(/\r?\n/u).filter(Boolean).length - 1),
      lastVerifiedPublishedBaseline: 984,
      target: TARGETS.quiz,
      gap: 0,
    },
    officialPackItems: official.length,
    wordleExpansionItems: wordleExpansion.length,
    wordleLot01Items: wordleLot01.length,
    wordleRemainingReviewItems: wordleRemaining.length,
    wordleProjectedAfterReview: {
      canonicalUnits: unique(projectedWordles.map(item => normalize(item.payload.word))),
      lengths: countBy(projectedWordles, item => String(wordLength(item.payload.word))),
    },
    remainingGamesReview: {
      status: remainingGamesPack.reviewStatus,
      items: remainingGames.length,
      projectedByGame,
    },
    games,
    overlaps: {
      memoryPairsAlsoInAssociation: associationPairs.filter(key => memorySet.has(key)).length,
      whoChallengesAlsoInThreeClues: threeChallenges.filter(key => whoSet.has(key)).length,
      uniqueAnswersSharedByWhoAndThree: [...new Set(threeAnswers)].filter(answer => new Set(whoAnswers).has(answer)).length,
    },
  };
}

const tableDistribution = (label, values, total) => {
  const cells = Object.entries(values).map(([key, value]) => `${key}: ${value} (${percent(value, total)})`);
  return `- ${label}: ${cells.join("; ")}.`;
};

export function renderInventory(inventory) {
  const games = inventory.games;
  const rows = [
    ["Quiz Bíblico", "perguntas publicadas", inventory.quiz.lastVerifiedPublishedBaseline, inventory.quiz.target, inventory.quiz.gap],
    ["Wordle Bíblico", games[GAME.WORDLE].unit, games[GAME.WORDLE].canonicalUnits, games[GAME.WORDLE].target, games[GAME.WORDLE].gap],
    ["Linha do Tempo", games[GAME.TIMELINE].unit, games[GAME.TIMELINE].canonicalUnits, games[GAME.TIMELINE].target, games[GAME.TIMELINE].gap],
    ["Memória Bíblica", games[GAME.MEMORY].unit, games[GAME.MEMORY].canonicalUnits, games[GAME.MEMORY].target, games[GAME.MEMORY].gap],
    ["Associação", games[GAME.ASSOCIATION].unit, games[GAME.ASSOCIATION].canonicalUnits, games[GAME.ASSOCIATION].target, games[GAME.ASSOCIATION].gap],
    ["Quem Sou Eu?", games[GAME.WHO].unit, games[GAME.WHO].canonicalUnits, games[GAME.WHO].target, games[GAME.WHO].gap],
    ["Três Pistas", games[GAME.THREE].unit, games[GAME.THREE].canonicalUnits, games[GAME.THREE].target, games[GAME.THREE].gap],
  ];
  const table = rows.map(row => `| ${row.join(" | ")} |`).join("\n");
  const wordle = games[GAME.WORDLE];

  return `# Inventário e lacunas — Content Scale-Up v2

**Status:** CURRENT LOCAL INVENTORY  
**Sprint:** 27.7.5B.2  
**Gerado deterministicamente de:** ${inventory.generatedFrom.map(value => `\`${value}\``).join(", ")}

## Limite da evidência

Este relatório mede somente fontes versionadas. Ele não consulta produção e não afirma que o pacote Wordle v2 já foi importado. Para Quiz, usa a última baseline operacional verificada de 984 publicados; o CSV autoral possui ${inventory.quiz.authoredCsvRows} linhas, mas não substitui a contagem CMS.

## Resumo das lacunas

| Jogo | Unidade | Inventário contabilizável | Meta | Lacuna |
|---|---|---:|---:|---:|
${table}

## Projeção do lote conjunto pendente

O arquivo \`content/content-scale-up-v2-remaining-games.json\` contém ${inventory.remainingGamesReview.items} candidatos em estado \`${inventory.remainingGamesReview.status}\`. Ele não integra o inventário contabilizável acima até aprovação humana, dry-run e importação controlada.

| Jogo | Conteúdos candidatos | Unidades canônicas projetadas após aprovação |
|---|---:|---:|
| Linha do Tempo | ${inventory.remainingGamesReview.projectedByGame[GAME.TIMELINE].candidateContents} | ${inventory.remainingGamesReview.projectedByGame[GAME.TIMELINE].canonicalUnits} |
| Memória | ${inventory.remainingGamesReview.projectedByGame[GAME.MEMORY].candidateContents} | ${inventory.remainingGamesReview.projectedByGame[GAME.MEMORY].canonicalUnits} pares |
| Associação | ${inventory.remainingGamesReview.projectedByGame[GAME.ASSOCIATION].candidateContents} | ${inventory.remainingGamesReview.projectedByGame[GAME.ASSOCIATION].canonicalUnits} |
| Quem Sou Eu? | ${inventory.remainingGamesReview.projectedByGame[GAME.WHO].candidateContents} | ${inventory.remainingGamesReview.projectedByGame[GAME.WHO].canonicalUnits} |
| Três Pistas | ${inventory.remainingGamesReview.projectedByGame[GAME.THREE].candidateContents} | ${inventory.remainingGamesReview.projectedByGame[GAME.THREE].canonicalUnits} |

Validade de schema e unicidade de conjunto não substituem revisão editorial. Em Quem Sou Eu? e Três Pistas, o lote combina desafios autorais existentes em novos conjuntos; repetição, progressão e identidade entre jogos exigem atenção humana explícita.

## Wordle

- pacote oficial: 120 soluções;
- expansão v2 aprovada: ${inventory.wordleExpansionItems} soluções;
- lote 01 aprovado pelo proprietário: ${inventory.wordleLot01Items} soluções;
- total local único: ${wordle.canonicalUnits};
- duplicatas exatas entre os pacotes aprovados: ${wordle.exactDuplicateItems};
- comprimentos: 5 letras ${wordle.lengths["5"] ?? 0}; 6 letras ${wordle.lengths["6"] ?? 0}; 7 letras ${wordle.lengths["7"] ?? 0};
- lacunas para 400 por comprimento: 5 letras ${400 - (wordle.lengths["5"] ?? 0)}; 6 letras ${400 - (wordle.lengths["6"] ?? 0)}; 7 letras ${400 - (wordle.lengths["7"] ?? 0)}.
- lote único restante pendente de revisão: ${inventory.wordleRemainingReviewItems} candidatos;
- projeção somente após aprovação humana: ${inventory.wordleProjectedAfterReview.canonicalUnits} soluções únicas — ${JSON.stringify(inventory.wordleProjectedAfterReview.lengths)}.
${tableDistribution("dificuldade", wordle.distribution.difficulty, wordle.sourceItems)}
${tableDistribution("Testamento", wordle.distribution.testament, wordle.sourceItems)}
${tableDistribution("categoria", wordle.distribution.category, wordle.sourceItems)}

Prioridade editorial: ampliar Novo Testamento e elevar proporcionalmente MEDIUM/HARD, sem usar obscuridade artificial.

## Linha do Tempo

- ${games[GAME.TIMELINE].sourceItems} conteúdos e ${games[GAME.TIMELINE].atomicUnits} ocorrências de eventos;
- ${games[GAME.TIMELINE].uniqueAtomicUnits} títulos de eventos únicos;
- ${games[GAME.TIMELINE].exactDuplicateItems} sequências exatas duplicadas;
${tableDistribution("dificuldade", games[GAME.TIMELINE].distribution.difficulty, games[GAME.TIMELINE].sourceItems)}
${tableDistribution("Testamento", games[GAME.TIMELINE].distribution.testament, games[GAME.TIMELINE].sourceItems)}
${tableDistribution("categoria", games[GAME.TIMELINE].distribution.category, games[GAME.TIMELINE].sourceItems)}

Prioridade editorial: Novo Testamento, ministério de Jesus, Atos e variedade real de sequências; não inflar a meta repetindo os mesmos eventos.

## Memória e Associação

- Memória: ${games[GAME.MEMORY].sourceItems} conjuntos, ${games[GAME.MEMORY].atomicUnits} pares e ${games[GAME.MEMORY].canonicalUnits} pares canônicos únicos;
- Associação: ${games[GAME.ASSOCIATION].sourceItems} conjuntos, ${games[GAME.ASSOCIATION].atomicUnits} pares e ${games[GAME.ASSOCIATION].uniqueAtomicUnits} pares únicos;
- pares de Memória também presentes em Associação: ${inventory.overlaps.memoryPairsAlsoInAssociation};
- duplicatas exatas de conjuntos: Memória ${games[GAME.MEMORY].exactDuplicateItems}; Associação ${games[GAME.ASSOCIATION].exactDuplicateItems}.
${tableDistribution("Memória — dificuldade", games[GAME.MEMORY].distribution.difficulty, games[GAME.MEMORY].sourceItems)}
${tableDistribution("Memória — Testamento", games[GAME.MEMORY].distribution.testament, games[GAME.MEMORY].sourceItems)}
${tableDistribution("Memória — categoria", games[GAME.MEMORY].distribution.category, games[GAME.MEMORY].sourceItems)}
${tableDistribution("Associação — dificuldade", games[GAME.ASSOCIATION].distribution.difficulty, games[GAME.ASSOCIATION].sourceItems)}
${tableDistribution("Associação — Testamento", games[GAME.ASSOCIATION].distribution.testament, games[GAME.ASSOCIATION].sourceItems)}
${tableDistribution("Associação — categoria", games[GAME.ASSOCIATION].distribution.category, games[GAME.ASSOCIATION].sourceItems)}

Prioridade editorial: Memória deve privilegiar pares curtos e visualmente combináveis; Associação deve ampliar relações conceituais, livros, lugares, povos, objetos e profetas. Sobreposição existente não é erro de schema, mas não deve orientar os novos lotes.

## Quem Sou Eu? e Três Pistas

- cada jogo possui ${games[GAME.WHO].sourceItems} conjuntos e ${games[GAME.WHO].atomicUnits} desafios;
- respostas únicas: Quem Sou Eu? ${games[GAME.WHO].uniqueAnswers}; Três Pistas ${games[GAME.THREE].uniqueAnswers};
- desafios idênticos compartilhados: ${inventory.overlaps.whoChallengesAlsoInThreeClues};
- respostas únicas compartilhadas: ${inventory.overlaps.uniqueAnswersSharedByWhoAndThree};
- duplicatas exatas internas de conjuntos: Quem Sou Eu? ${games[GAME.WHO].exactDuplicateItems}; Três Pistas ${games[GAME.THREE].exactDuplicateItems}.
${tableDistribution("Quem Sou Eu? — dificuldade", games[GAME.WHO].distribution.difficulty, games[GAME.WHO].sourceItems)}
${tableDistribution("Quem Sou Eu? — Testamento", games[GAME.WHO].distribution.testament, games[GAME.WHO].sourceItems)}
${tableDistribution("Quem Sou Eu? — categoria", games[GAME.WHO].distribution.category, games[GAME.WHO].sourceItems)}
${tableDistribution("Três Pistas — dificuldade", games[GAME.THREE].distribution.difficulty, games[GAME.THREE].sourceItems)}
${tableDistribution("Três Pistas — Testamento", games[GAME.THREE].distribution.testament, games[GAME.THREE].sourceItems)}
${tableDistribution("Três Pistas — categoria", games[GAME.THREE].distribution.category, games[GAME.THREE].sourceItems)}

Conclusão: o pacote inicial usa os dois jogos quase como espelhos. Os novos lotes devem corrigir a identidade prospectivamente: Quem Sou Eu? focado em identidades; Três Pistas com personagens limitados e predominância de lugares, eventos, objetos, livros, conceitos, povos, símbolos e natureza.

## Plano de lotes

| Frente | Lacuna | Tamanho máximo sugerido | Quantidade estimada |
|---|---:|---:|---:|
| Wordle | ${games[GAME.WORDLE].gap} soluções | lote único excepcional autorizado | 1 lote pendente de revisão |
| Linha do Tempo | ${games[GAME.TIMELINE].gap} sequências | 50 conteúdos | 16 lotes |
| Memória | ${games[GAME.MEMORY].gap} pares | 30 pares | 6 lotes |
| Associação | ${games[GAME.ASSOCIATION].gap} conjuntos | 50 conteúdos | 15 lotes |
| Quem Sou Eu? | ${games[GAME.WHO].gap} conjuntos | 50 conteúdos | 15 lotes |
| Três Pistas | ${games[GAME.THREE].gap} conjuntos | 50 conteúdos | 15 lotes |

Para Wordle, o proprietário autorizou excepcionalmente um lote único dos 877 candidatos restantes. Nos demais jogos permanece a recomendação de lotes pequenos. Em todos os casos, revisão, dry-run, aprovação e publicação são gates independentes; nada é publicado automaticamente.

## Ordem recomendada

1. Wordle por comprimento: preencher 5 letras, depois 6 e 7, equilibrando Testamentos e dificuldade.
2. Memória: completar 180 pares canônicos com baixa ambiguidade e alta combinabilidade.
3. Linha do Tempo: ampliar eixos sub-representados sem cronologias controversas.
4. Associação: diversificar relações antes de aumentar personagens.
5. Quem Sou Eu?: produzir identidades sem replicar o catálogo inicial.
6. Três Pistas: iniciar por não personagens para romper imediatamente a sobreposição histórica.

## Critério para iniciar produção

- matriz editorial aprovada;
- inventário determinístico verde;
- unidade canônica e fingerprint definidos;
- lote limitado conforme este plano;
- nenhuma escrita ou publicação antes de dry-run e aprovação humana.
`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const inventory = await buildInventory();
  const report = renderInventory(inventory);
  if (process.argv.includes("--check")) {
    const current = await readFile(REPORT_PATH, "utf8").catch(() => "");
    if (current !== report) throw new Error("content_scale_up_inventory_outdated");
  } else if (process.argv.includes("--stdout")) {
    process.stdout.write(report);
  } else {
    await writeFile(REPORT_PATH, report, "utf8");
    console.log(`Inventory written to ${REPORT_PATH}`);
  }
}
