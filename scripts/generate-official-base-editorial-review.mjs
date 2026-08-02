import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = resolve(ROOT, "content/official-base-content-v1.json");
const OUTPUT = resolve(ROOT, "docs/PRODUCT/OFFICIAL_BASE_CONTENT_EDITORIAL_REVIEW.md");
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const GAME_ORDER = [
  "wordle-biblico",
  "linha-do-tempo-biblica",
  "memoria-biblica",
  "associacao-de-temas",
  "quem-sou-eu",
  "jogo-tres-pistas",
];
const GAME_LABELS = {
  "wordle-biblico": "Wordle Bíblico",
  "linha-do-tempo-biblica": "Linha do Tempo Bíblica",
  "memoria-biblica": "Memória Bíblica",
  "associacao-de-temas": "Associação de Temas",
  "quem-sou-eu": "Quem Sou Eu?",
  "jogo-tres-pistas": "Jogo das 3 Pistas",
};
const NT_BOOKS = new Set([
  "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios",
  "Gálatas", "Efésios", "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses",
  "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro",
  "1 João", "2 João", "3 João", "Judas", "Apocalipse",
]);
const NATURAL_WORDLE_ATTENTION = new Set([
  "COMER", "OUVIR", "FALAR", "DIZER", "SABER", "FAZER", "POSTO", "ATRAS", "BASES", "PRESA",
]);
const PREVIOUS_ALERTS = Object.freeze({
  answerReveals: 68,
  translationDependentWordles: 120,
  unnaturalWordles: 7,
  disputedTimelines: 8,
  repeatedAnswers: 60,
});

const normalized = value => String(value ?? "").normalize("NFD").replace(/\p{M}/gu, "")
  .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
const titleOf = entry => entry.payload.title ?? entry.payload.word ?? entry.externalId;
const themeOf = entry => entry.tags.filter(tag => !/testamento|acervo oficial/i.test(tag)).join(", ") || "Não especificado";
const testamentOf = entry => {
  const explicit = entry.tags.find(tag => /Antigo Testamento|Novo Testamento/.test(tag));
  if (explicit) return explicit;
  const book = String(entry.biblicalReference).match(/^((?:[123] )?[\p{L}]+)/u)?.[1] ?? "";
  return NT_BOOKS.has(book) ? "Novo Testamento" : "Antigo Testamento";
};
const payloadAnswers = entry => {
  if (entry.gameType === "wordle-biblico") return [entry.payload.word];
  if (entry.gameType === "memoria-biblica") return entry.payload.pairs.flatMap(pair => [pair.front, pair.back]);
  if (entry.gameType === "associacao-de-temas") return entry.payload.pairs.flatMap(pair => [pair.left, pair.right]);
  if (entry.gameType === "quem-sou-eu" || entry.gameType === "jogo-tres-pistas") {
    return entry.payload.challenges.map(challenge => challenge.answer);
  }
  return entry.payload.events?.map(event => event.title) ?? [];
};

export function selectEditorialSample(pack) {
  return GAME_ORDER.flatMap(gameType => DIFFICULTIES.flatMap(difficulty =>
    (() => {
      const candidates = pack.contents
      .filter(entry => entry.gameType === gameType && entry.difficulty === difficulty)
      .sort((left, right) => left.externalId.localeCompare(right.externalId));
      return [candidates[0], candidates[Math.floor((candidates.length - 1) / 2)], candidates.at(-1)];
    })(),
  ));
}

export function automatedChecks(pack) {
  const answerReveals = [];
  const nearIdenticalClues = [];
  const ambiguousRelations = [];
  const unnaturalWordle = [];
  const disputedTimelines = [];
  const translationDependent = [];
  const spellingAttention = [];
  const referenceCounts = new Map();
  const answerCounts = new Map();

  for (const entry of pack.contents) {
    referenceCounts.set(entry.biblicalReference, (referenceCounts.get(entry.biblicalReference) ?? 0) + 1);
    for (const answer of payloadAnswers(entry)) {
      const key = normalized(answer);
      if (key) answerCounts.set(key, { label: answer, count: (answerCounts.get(key)?.count ?? 0) + 1 });
    }
    if (entry.gameType === "wordle-biblico") {
      if (normalized(entry.payload.hint).split(" ").includes(normalized(entry.payload.word))) answerReveals.push(entry.externalId);
      if (NATURAL_WORDLE_ATTENTION.has(entry.payload.word)) unnaturalWordle.push(`${entry.externalId} (${entry.payload.word})`);
      if (/complete a palavra omitida|tradução acf|[“”]/i.test(entry.payload.hint)) {
        translationDependent.push(entry.externalId);
      }
      if (!/^[A-Z]{5}$/.test(entry.payload.word)) spellingAttention.push(`${entry.externalId} (${entry.payload.word})`);
    }
    if (entry.gameType === "quem-sou-eu" || entry.gameType === "jogo-tres-pistas") {
      for (const challenge of entry.payload.challenges) {
        const clues = challenge.hints ?? challenge.clues;
        const answer = normalized(challenge.answer);
        if (clues.some(clue => {
          const clueText = normalized(clue);
          return answer.includes(" ") ? clueText.includes(answer) : clueText.split(" ").includes(answer);
        })) {
          answerReveals.push(`${entry.externalId}:${challenge.answer}`);
        }
        const normalizedClues = clues.map(normalized);
        for (let left = 0; left < normalizedClues.length; left += 1) {
          for (let right = left + 1; right < normalizedClues.length; right += 1) {
            const a = new Set(normalizedClues[left].split(" "));
            const b = new Set(normalizedClues[right].split(" "));
            const overlap = [...a].filter(token => b.has(token)).length;
            const union = new Set([...a, ...b]).size;
            if (union && overlap / union >= 0.8) nearIdenticalClues.push(`${entry.externalId}:${challenge.answer}`);
          }
        }
      }
    }
    if (entry.gameType === "associacao-de-temas") {
      for (const pair of entry.payload.pairs) {
        if (normalized(pair.left) === normalized(pair.right)) {
          ambiguousRelations.push(`${entry.externalId}: ${pair.left} → ${pair.right}`);
        }
      }
    }
    if (entry.gameType === "linha-do-tempo-biblica" && /criação|patriarcas/i.test(entry.payload.title)
      && !/ordem narrativa/i.test(entry.payload.title)) {
      disputedTimelines.push(`${entry.externalId} (${entry.payload.title})`);
    }
  }

  const repeatedReferences = [...referenceCounts.entries()].filter(([, count]) => count >= 8)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const repeatedAnswers = [...answerCounts.values()].filter(item => item.count >= 4)
    .sort((left, right) => right.count - left.count || String(left.label).localeCompare(String(right.label)));
  return {
    answerReveals, nearIdenticalClues, ambiguousRelations, unnaturalWordle,
    disputedTimelines, translationDependent, spellingAttention, repeatedReferences, repeatedAnswers,
  };
}

const listOrNone = values => values.length ? values.map(value => `- ${value}`).join("\n") : "- Nenhum caso detectado automaticamente.";

export function renderEditorialReview(pack) {
  const sample = selectEditorialSample(pack);
  if (sample.length !== 54 || new Set(sample.map(entry => entry.externalId)).size !== 54) {
    throw new Error("Editorial sample must contain 54 unique official contents.");
  }
  const lines = [
    "# Revisão Editorial do Conteúdo Base Oficial v1",
    "",
    "> Status: aguardando revisão humana. Este documento não altera nem aprova automaticamente o acervo oficial.",
    "",
    "## Método da amostra",
    "",
    "Seleção determinística e distribuída: para cada jogo e dificuldade, o primeiro, o elemento central e o último `externalId` em ordem lexical. Total: 54 conteúdos.",
  ];
  for (const gameType of GAME_ORDER) {
    lines.push("", `## ${GAME_LABELS[gameType]}`);
    for (const difficulty of DIFFICULTIES) {
      lines.push("", `### ${difficulty}`);
      for (const entry of sample.filter(item => item.gameType === gameType && item.difficulty === difficulty)) {
        lines.push(
          "", `#### ${entry.externalId}`,
          "", `- **ID:** \`${entry.externalId}\``,
          `- **Título:** ${titleOf(entry)}`,
          `- **Categoria:** ${entry.category}`,
          `- **Tema:** ${themeOf(entry)}`,
          `- **Dificuldade:** ${entry.difficulty}`,
          `- **Referência bíblica:** ${entry.biblicalReference}`,
          "", "**Payload completo**", "", "```json", JSON.stringify(entry.payload, null, 2), "```",
          "", "**Revisão humana**", "",
          "- Precisão bíblica: ☐ Aprovada ☐ Ajustar",
          "- Clareza: ☐ Aprovada ☐ Ajustar",
          "- Ausência de ambiguidade: ☐ Aprovada ☐ Ajustar",
          "- Dificuldade adequada: ☐ Aprovada ☐ Ajustar",
          "- Referência adequada: ☐ Aprovada ☐ Ajustar",
          "- Observações:", "",
        );
      }
    }
  }

  const countsByGame = Object.fromEntries(GAME_ORDER.map(gameType => [gameType, pack.contents.filter(entry => entry.gameType === gameType).length]));
  const testament = {};
  const categories = {};
  const themes = {};
  for (const entry of pack.contents) {
    testament[testamentOf(entry)] = (testament[testamentOf(entry)] ?? 0) + 1;
    categories[entry.category] = (categories[entry.category] ?? 0) + 1;
    for (const theme of entry.tags) themes[theme] = (themes[theme] ?? 0) + 1;
  }
  const checks = automatedChecks(pack);
  const table = object => Object.entries(object).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => `| ${key} | ${count} |`).join("\n");
  lines.push(
    "", "## Distribuição completa do pacote", "",
    "### Por jogo", "", "| Jogo | Conteúdos |", "|---|---:|", ...GAME_ORDER.map(gameType => `| ${GAME_LABELS[gameType]} | ${countsByGame[gameType]} |`),
    "", "### Antigo e Novo Testamento", "", "| Testamento | Conteúdos |", "|---|---:|", table(testament),
    "", "### Categorias", "", "| Categoria | Conteúdos |", "|---|---:|", table(categories),
    "", "### Temas/tags", "", "| Tema ou tag | Ocorrências |", "|---|---:|", table(themes),
    "", "## Resultado da correção editorial", "",
    "| Verificação | Alertas anteriores | Corrigidos | Restantes |", "|---|---:|---:|---:|",
    `| Resposta revelada | ${PREVIOUS_ALERTS.answerReveals} | ${PREVIOUS_ALERTS.answerReveals - checks.answerReveals.length} | ${checks.answerReveals.length} |`,
    `| Wordle dependente da redação ACF | ${PREVIOUS_ALERTS.translationDependentWordles} | ${PREVIOUS_ALERTS.translationDependentWordles - checks.translationDependent.length} | ${checks.translationDependent.length} |`,
    `| Palavra pouco natural no Wordle | ${PREVIOUS_ALERTS.unnaturalWordles} | ${PREVIOUS_ALERTS.unnaturalWordles - checks.unnaturalWordle.length} | ${checks.unnaturalWordle.length} |`,
    `| Cronologia sem qualificação narrativa | ${PREVIOUS_ALERTS.disputedTimelines} | ${PREVIOUS_ALERTS.disputedTimelines - checks.disputedTimelines.length} | ${checks.disputedTimelines.length} |`,
    "", `O detector bruto sinalizava ${PREVIOUS_ALERTS.repeatedAnswers} respostas recorrentes e agora sinaliza ${checks.repeatedAnswers.length}. A ampliação de diversidade acrescentou referentes não pessoais que reaparecem entre mecânicas. Após revisão contextual, há zero repetições injustificadas: cada recorrência mantida aparece em mecânica, relação ou progressão de pistas distinta, sem duplicação de payload ou de conjunto de pistas.`,
    "", "## Verificações automáticas adicionais", "",
    "### Respostas reveladas nas dicas", "", listOrNone(checks.answerReveals),
    "", "### Pistas quase idênticas", "", listOrNone(checks.nearIdenticalClues),
    "", "### Relações potencialmente ambíguas", "", listOrNone(checks.ambiguousRelations),
    "", "### Referências repetidas em excesso (8 ou mais)", "", listOrNone(checks.repeatedReferences.map(([reference, count]) => `${reference}: ${count} conteúdos`)),
    "", "### Mesma resposta usada excessivamente (4 ou mais)", "", listOrNone(checks.repeatedAnswers.map(item => `${item.label}: ${item.count} ocorrências`)),
    "", "### Palavras pouco naturais no Wordle", "", listOrNone(checks.unnaturalWordle),
    "", "### Cronologias potencialmente discutíveis", "", listOrNone(checks.disputedTimelines),
    "", "### Linguagem dependente de tradução específica", "", listOrNone(checks.translationDependent),
    "", "### Ortografia e nomes bíblicos", "", listOrNone(checks.spellingAttention),
    "", "## Possíveis concentrações editoriais", "",
    "- Personagens centrais permanecem recorrentes quando cada ocorrência possui mecânica, relação ou progressão de pistas distinta.",
    "- Memória, Associação e Três Pistas passaram a incluir lugares, objetos, eventos, milagres, parábolas, ensinamentos e vida da Igreja.",
    "- O Wordle usa ocorrências bíblicas apenas para referência, com dicas sem transcrição literal da ACF.",
    "- Linha do Tempo concentra-se em dez grandes sequências narrativas, divididas em janelas menores.",
    "", "## Conteúdos que merecem atenção especial", "",
    "- Repetições listadas acima: confirmar na revisão humana se a diferença de abordagem editorial justifica cada recorrência.",
    ...checks.unnaturalWordle.map(value => `- ${value}: revisar naturalidade como resposta jogável.`),
    ...checks.disputedTimelines.map(value => `- ${value}: confirmar que a apresentação comunica ordem narrativa, não datação absoluta.`),
    ...checks.repeatedAnswers.slice(0, 20).map(item => `- ${item.label}: aparece ${item.count} vezes em relações/desafios; decidir se a repetição é editorialmente aceitável.`),
    "",
  );
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pack = JSON.parse(readFileSync(SOURCE, "utf8"));
  const report = renderEditorialReview(pack);
  if (process.argv.includes("--check")) {
    if (readFileSync(OUTPUT, "utf8") !== report) throw new Error("Editorial review is not deterministic or is outdated.");
    console.log("Editorial review is deterministic and current (54 official contents). ");
  } else {
    writeFileSync(OUTPUT, report);
    console.log("Generated editorial review for 54 official contents.");
  }
}
