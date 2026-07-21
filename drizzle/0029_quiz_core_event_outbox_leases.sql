ALTER TABLE quiz_core_event_outbox ADD COLUMN lease_token TEXT;
ALTER TABLE quiz_core_event_outbox ADD COLUMN lease_until INTEGER;

CREATE INDEX quiz_core_event_outbox_claim_idx
  ON quiz_core_event_outbox(delivery_state, next_attempt_at, lease_until, created_at);
