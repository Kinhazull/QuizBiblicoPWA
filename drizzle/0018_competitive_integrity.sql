ALTER TABLE choices ADD COLUMN position INTEGER;
UPDATE choices
   SET position=(SELECT COUNT(*)-1 FROM choices prior WHERE prior.question_id=choices.question_id AND prior.rowid<=choices.rowid)
 WHERE position IS NULL;
CREATE UNIQUE INDEX choices_question_position_uq ON choices(question_id,position);
CREATE TRIGGER choices_fill_position_after_insert
AFTER INSERT ON choices WHEN NEW.position IS NULL
BEGIN
  UPDATE choices SET position=(SELECT COUNT(*)-1 FROM choices sibling WHERE sibling.question_id=NEW.question_id AND sibling.rowid<=NEW.rowid) WHERE id=NEW.id;
END;
CREATE UNIQUE INDEX attempt_answers_order_uq ON attempt_answers(attempt_id,question_order);
CREATE UNIQUE INDEX questions_round_source_uq ON questions(round_id,source_question_id) WHERE source_question_id IS NOT NULL;

ALTER TABLE legal_consents ADD COLUMN organization_id TEXT;
ALTER TABLE legal_consents ADD COLUMN document_type TEXT NOT NULL DEFAULT 'terms_and_privacy';
ALTER TABLE legal_consents ADD COLUMN ip_hash TEXT;
ALTER TABLE legal_consents ADD COLUMN user_agent TEXT;
UPDATE legal_consents SET organization_id=(SELECT organization_id FROM users WHERE users.id=legal_consents.user_id) WHERE organization_id IS NULL;
CREATE INDEX legal_consents_org_time_idx ON legal_consents(organization_id,accepted_at DESC);
