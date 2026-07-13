-- LIMPEZA DE HOMOLOGAÇÃO
-- Preserva organizações, grupos e todas as contas com role='admin'.
PRAGMA foreign_keys = ON;

DELETE FROM attempt_answers;
DELETE FROM attempts;
DELETE FROM choices;
DELETE FROM questions;
DELETE FROM rounds;
DELETE FROM user_badges;
DELETE FROM notification_receipts;
DELETE FROM audit_logs;
DELETE FROM login_security;
DELETE FROM invitations;
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE role <> 'admin');
DELETE FROM users WHERE role <> 'admin';

-- Resultado esperado: somente administradores.
SELECT id, username, display_name, role, status FROM users ORDER BY created_at;
