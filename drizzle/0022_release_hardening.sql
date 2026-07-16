CREATE INDEX audit_action_entity_time_idx
  ON audit_logs(action, entity_id, created_at);
