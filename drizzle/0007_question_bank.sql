CREATE TABLE question_bank (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  reference TEXT,
  book TEXT,
  theme TEXT NOT NULL,
  category TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  prompt TEXT NOT NULL,
  normalized_prompt TEXT NOT NULL,
  commentary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  times_used INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX question_bank_org_prompt_uq ON question_bank(organization_id, normalized_prompt);
CREATE INDEX question_bank_filters_idx ON question_bank(organization_id, status, theme, book, category, difficulty);
CREATE INDEX question_bank_updated_idx ON question_bank(organization_id, updated_at DESC);

CREATE TABLE question_bank_choices (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  correct INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX question_bank_choices_position_uq ON question_bank_choices(question_id, position);

ALTER TABLE questions ADD COLUMN source_question_id TEXT REFERENCES question_bank(id);
CREATE INDEX questions_source_idx ON questions(source_question_id);

-- Leva o conteúdo já publicado para o acervo sem modificar as rodadas existentes.
INSERT OR IGNORE INTO question_bank
  (id, organization_id, reference, book, theme, category, difficulty, prompt, normalized_prompt, commentary, status, times_used, created_by, created_at, updated_at)
SELECT 'bank-' || q.id, r.organization_id, q.reference, NULL, r.theme, NULL, 'medium', q.prompt,
       lower(trim(q.prompt)), q.commentary, 'active', COUNT(r2.id), r.created_by, r.created_at, r.updated_at
  FROM questions q
  JOIN rounds r ON r.id=q.round_id
  LEFT JOIN questions q2 ON lower(trim(q2.prompt))=lower(trim(q.prompt))
  LEFT JOIN rounds r2 ON r2.id=q2.round_id AND r2.organization_id=r.organization_id
 GROUP BY r.organization_id, lower(trim(q.prompt));

INSERT OR IGNORE INTO question_bank_choices (id, question_id, position, text, correct)
SELECT 'bank-' || c.id, qb.id,
       ROW_NUMBER() OVER (PARTITION BY qb.id ORDER BY c.id) - 1, c.text, c.correct
  FROM question_bank qb
  JOIN questions q ON lower(trim(q.prompt))=qb.normalized_prompt
  JOIN rounds r ON r.id=q.round_id AND r.organization_id=qb.organization_id
  JOIN choices c ON c.question_id=q.id
 WHERE qb.id LIKE 'bank-%'
   AND q.id=substr(qb.id, 6);

UPDATE questions
   SET source_question_id=(SELECT qb.id FROM question_bank qb JOIN rounds r ON r.id=questions.round_id WHERE qb.organization_id=r.organization_id AND qb.normalized_prompt=lower(trim(questions.prompt)) LIMIT 1)
 WHERE source_question_id IS NULL;
