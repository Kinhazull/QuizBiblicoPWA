ALTER TABLE attempts ADD COLUMN question_order_json TEXT;

DROP INDEX attempts_user_round_number_uq;
CREATE UNIQUE INDEX attempts_user_round_mode_number_uq
  ON attempts(user_id, round_id, mode, attempt_number);

CREATE INDEX attempts_user_round_mode_status_idx
  ON attempts(user_id, round_id, mode, status);
