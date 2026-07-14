export const QUESTION_LIMITS = { prompt: 500, choice: 300, theme: 80, book: 80, category: 80, reference: 120, commentary: 1000 } as const;
export const QUESTION_COUNT = 10;
const difficulties = new Set(["easy", "medium", "hard"]);
const unsafeText = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F�]/;

export function normalizeQuestion(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

export function normalizeChoice(value: unknown) {
  return normalizeQuestion(value);
}

export type ValidQuestion = { prompt: string; choices: string[]; correctIndex: number; reference: string | null; book: string | null; theme: string; category: string | null; difficulty: "easy" | "medium" | "hard"; commentary: string | null };
export type QuestionValidation = { ok: true; value: ValidQuestion } | { ok: false; error: string };

function text(value: unknown, maximum: number, required = false) {
  if (typeof value !== "string" && value !== undefined && value !== null) return null;
  const result = String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if ((required && !result) || result.length > maximum || unsafeText.test(result)) return null;
  return result;
}

export function validateQuestionResult(input: unknown): QuestionValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "invalid_structure" };
  const source = input as Record<string, unknown>;
  const prompt = text(source.prompt, QUESTION_LIMITS.prompt, true);
  if (!prompt || prompt.length < 8) return { ok: false, error: "invalid_prompt" };
  if (!Array.isArray(source.choices) || source.choices.length !== 4) return { ok: false, error: "invalid_choice_count" };
  const choices = source.choices.map(choice => text(choice, QUESTION_LIMITS.choice, true));
  if (choices.some(choice => !choice)) return { ok: false, error: "invalid_choice" };
  const normalizedChoices = choices.map(choice => normalizeChoice(choice));
  if (new Set(normalizedChoices).size !== 4) return { ok: false, error: "duplicate_choices" };
  if (typeof source.correctIndex !== "number" || !Number.isInteger(source.correctIndex) || source.correctIndex < 0 || source.correctIndex > 3) return { ok: false, error: "invalid_correct_choice" };
  const theme = text(source.theme, QUESTION_LIMITS.theme, true);
  if (!theme || theme.length < 2) return { ok: false, error: "invalid_theme" };
  if (typeof source.difficulty !== "string" || !difficulties.has(source.difficulty)) return { ok: false, error: "invalid_difficulty" };
  const reference = text(source.reference, QUESTION_LIMITS.reference), book = text(source.book, QUESTION_LIMITS.book), category = text(source.category, QUESTION_LIMITS.category), commentary = text(source.commentary, QUESTION_LIMITS.commentary);
  if (reference === null || book === null || category === null || commentary === null) return { ok: false, error: "invalid_metadata" };
  return { ok: true, value: { prompt, choices: choices as string[], correctIndex: source.correctIndex, reference: reference || null, book: book || null, theme, category: category || null, difficulty: source.difficulty as ValidQuestion["difficulty"], commentary: commentary || null } };
}

export function validateQuestion(input: unknown) {
  const result = validateQuestionResult(input);
  return result.ok ? result.value : null;
}

export function buildQuestionBankBatch(env: { DB: D1Database }, records: Array<ValidQuestion & { id: string }>, organizationId: string, actorId: string, now: number, categoryOverride?: string, reviewStatus = "draft") {
  const statements: D1PreparedStatement[] = [];
  for (let offset = 0; offset < records.length; offset += 7) {
    const chunk = records.slice(offset, offset + 7), values: unknown[] = [];
    const rows = chunk.map(record => { values.push(record.id, organizationId, record.reference, record.book, record.theme, categoryOverride || record.category, record.difficulty, record.prompt, normalizeQuestion(record.prompt), record.commentary, reviewStatus, actorId, now, now); return `(?,?,?,?,?,?,?,?,?,?,'active',?,0,?,?,?)`; });
    statements.push(env.DB.prepare(`INSERT INTO question_bank (id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,commentary,status,review_status,times_used,created_by,created_at,updated_at) VALUES ${rows.join(",")}`).bind(...values));
  }
  const choices = records.flatMap(record => record.choices.map((choice, position) => ({ id: crypto.randomUUID(), questionId: record.id, position, text: choice, correct: position === record.correctIndex ? 1 : 0 })));
  for (let offset = 0; offset < choices.length; offset += 20) {
    const chunk = choices.slice(offset, offset + 20), values = chunk.flatMap(choice => [choice.id, choice.questionId, choice.position, choice.text, choice.correct]);
    statements.push(env.DB.prepare(`INSERT INTO question_bank_choices (id,question_id,position,text,correct) VALUES ${chunk.map(() => `(?,?,?,?,?)`).join(",")}`).bind(...values));
  }
  return statements;
}
