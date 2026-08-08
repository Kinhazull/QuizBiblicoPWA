# Exportação e Exclusão de Dados

## Exportação pessoal v2

`GET /api/privacy/me` exige sessão válida, deriva usuário e organização da sessão e responde `no-store, private`. O JSON contém versão, horário ISO, identidade do titular e seções de conta, Quiz histórico, plataforma, jogos/modos, comunicações e contribuições editoriais.

Inclui perfil, consentimentos, XP, moedas, ledgers, missões, retenção derivada, cofre/login diário registrados nos ledgers, inventário/equipamentos derivados dos ledgers, conquistas, estatísticas, seleções, participações DAILY/FREE_PLAY/EVENT, usos, recompensas de Eventos, notificações e contribuições CMS. Não inclui hashes, salts, tokens, sessões, recovery codes, cookies, segredos, payload protegido ou dados de terceiros.

## Solicitação e execução

1. O titular autenticado confirma a senha e cria pedido idempotente.
2. Um administrador da mesma organização com `members.manage` confirma sua própria senha e a frase `ANONIMIZAR_CONTA`.
3. A transação anonimiza perfil/credenciais, revoga todas as sessões, remove recovery codes, permissões e receipts de notificação.
4. O registro pseudônimo permanece para preservar FKs, conteúdo organizacional, ledgers e histórico.
5. O pedido e a auditoria são concluídos uma única vez.
6. `PRAGMA foreign_key_check` confirma integridade no exercício isolado.

Repetir a operação retorna estado já anonimizado sem duplicar efeitos. Nenhuma exclusão física de CMS, Eventos, resultados ou ledgers é disparada pelo cliente.

## Limites atuais

- O fluxo continua administrativamente aprovado; não é exclusão automática imediata.
- Backups exigem política futura de tombstone/supressão antes de restauração em produção.
- Prazos e fundamentos jurídicos exigem validação humana: `LEGAL_REVIEW_REQUIRED`.
- A operação real deve seguir procedimento autorizado; os testes desta sprint utilizam apenas D1 SQLite isolado.
