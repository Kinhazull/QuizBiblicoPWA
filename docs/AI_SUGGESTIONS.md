# Sugestões com IA

O recurso está temporariamente desativado por `AI_SUGGESTIONS_ENABLED = false` em `shared/features.ts`.

Enquanto desativado, o menu e os indicadores não são exibidos, a página redireciona ao banco de perguntas e os handlers retornam `404` com `feature_disabled` antes de qualquer chamada externa. Tabelas, migrations e histórico foram preservados para uma futura reativação revisada.

O binding `AI` existente não significa que o recurso esteja liberado. Durante o piloto v1.0 ele permanece fora do escopo aprovado, não realiza chamadas e não deve ser apresentado ao usuário. Critérios para reativação estão no `BACKLOG.md`.
