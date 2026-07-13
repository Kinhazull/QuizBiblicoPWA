export function normalizeQuestion(value: unknown) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function validateQuestion(input: any) {
  const prompt = String(input?.prompt || "").trim();
  const choices = Array.isArray(input?.choices) ? input.choices.map((item: unknown) => String(item || "").trim()) : [];
  const correctIndex = Number(input?.correctIndex);
  if (prompt.length < 8 || choices.length !== 4 || choices.some((item: string) => item.length < 1) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;
  return {
    prompt, choices, correctIndex,
    reference: String(input.reference || "").trim() || null,
    book: String(input.book || "").trim() || null,
    theme: String(input.theme || "Geral").trim(),
    category: String(input.category || "").trim() || null,
    difficulty: ["easy", "medium", "hard"].includes(input.difficulty) ? input.difficulty : "medium",
    commentary: String(input.commentary || "").trim() || null,
  };
}

export function buildQuestionBankBatch(env: { DB: D1Database }, records: any[], organizationId: string, actorId: string, now: number, categoryOverride?: string, reviewStatus = "draft") {
  const statements: D1PreparedStatement[] = [];
  for (let offset = 0; offset < records.length; offset += 7) {
    const chunk = records.slice(offset, offset + 7); const values: any[] = [];
    const rows = chunk.map(record => { values.push(record.id, organizationId, record.reference, record.book, record.theme, categoryOverride || record.category, record.difficulty, record.prompt, normalizeQuestion(record.prompt), record.commentary, reviewStatus, actorId, now, now); return `(?,?,?,?,?,?,?,?,?,?,'active',?,0,?,?,?)`; });
    statements.push(env.DB.prepare(`INSERT INTO question_bank (id,organization_id,reference,book,theme,category,difficulty,prompt,normalized_prompt,commentary,status,review_status,times_used,created_by,created_at,updated_at) VALUES ${rows.join(",")}`).bind(...values));
  }
  const choices = records.flatMap(record => record.choices.map((text: string, position: number) => ({ id: crypto.randomUUID(), questionId: record.id, position, text, correct: position === record.correctIndex ? 1 : 0 })));
  for (let offset = 0; offset < choices.length; offset += 20) {
    const chunk = choices.slice(offset, offset + 20); const values = chunk.flatMap(choice => [choice.id, choice.questionId, choice.position, choice.text, choice.correct]);
    statements.push(env.DB.prepare(`INSERT INTO question_bank_choices (id,question_id,position,text,correct) VALUES ${chunk.map(() => `(?,?,?,?,?)`).join(",")}`).bind(...values));
  }
  return statements;
}
