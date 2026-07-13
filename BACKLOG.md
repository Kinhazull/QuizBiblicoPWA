# Backlog — Conte os Feitos

## Antes da divulgação

- Aplicar `0016_runtime_hardening.sql` no D1.
- Confirmar binding `DB` e, se desejado, `AI` no ambiente de produção.
- Remover `BOOTSTRAP_SECRET` após validar que a comunidade já está configurada.
- Fazer teste simultâneo com múltiplos celulares no dia anterior ao lançamento.
- Executar o roteiro de `OPERATIONS.md`.

## Próxima atualização — baixo ou médio esforço

- Testes dos endpoints no runtime Cloudflare com `@cloudflare/vitest-pool-workers`.
- Paginação/streaming para exportações acima de 5.000 registros.
- Indicador de consumo mensal do Workers AI no painel administrativo.
- Expiração configurável e revogação em lote de convites antigos.
- Política automática de retenção para sugestões de IA descartadas e contadores vencidos.
- Separar backup administrativo de uma futura cópia integral criptografada e restaurável.
- Segundo fator TOTP opcional para administradores, após definir recuperação segura.

## Futuro — somente quando houver necessidade medida

- Múltiplos grupos ou comunidades; antes disso, adaptar o login para identificar a organização.
- Notificações push, segmentação avançada e estatísticas de leitura.
- Modo projetor.
- Sistema social, amigos, comentários e mensagens.
- Missões e objetivos que não conflitem com medalhas e rankings.
- Recuperação de conta por e-mail.
- Busca textual avançada/FTS quando o acervo ultrapassar o desempenho do índice atual.

## Princípio de infraestrutura

Priorizar D1 e Pages Functions já existentes. Adicionar novos produtos Cloudflare ou serviços externos apenas depois de medir um gargalo real e confirmar que a alternativa permanece no plano gratuito.
