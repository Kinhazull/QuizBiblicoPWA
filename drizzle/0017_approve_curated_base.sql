-- Regulariza apenas a base editorial curada criada antes do fluxo de revisão.
UPDATE question_bank
SET status = 'active', review_status = 'approved', updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE category = 'Base inicial' AND status <> 'archived';
