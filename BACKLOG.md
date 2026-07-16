# Backlog — Conte os Feitos

## Piloto v1.0 — itens operacionais

- Executar o roteiro de `OPERATIONS.md` antes de cada publicação.
- Manter a aprovação atual restrita ao piloto controlado de 5–10 usuários.
- Manter fora do aplicativo a evidência da autorização do responsável legal por participante menor.
- Exercitar a restauração de backup em um D1 isolado antes de depender do procedimento em incidente real.

## Próxima atualização — baixo ou médio esforço

- Testes dos endpoints no runtime Cloudflare com `@cloudflare/vitest-pool-workers`.
- Paginação/streaming para exportações acima de 5.000 registros.
- Indicador de consumo mensal do Workers AI no painel administrativo.
- Expiração configurável e revogação em lote de convites antigos.
- Política automática de retenção para sugestões de IA descartadas e contadores vencidos.
- Separar backup administrativo de uma futura cópia integral criptografada e restaurável.
- Segundo fator TOTP opcional para administradores, após definir recuperação segura.
- Monitor externo para falhas ou fila parada do Worker, caso seja possível mantê-lo no plano gratuito.
- Reduzir `unsafe-inline` da CSP quando a arquitetura de build permitir nonces ou hashes sem quebrar a hidratação.
- Aumentar o lote do Cron somente após medir consumo e backlog reais.
- Reativar sugestões com IA somente após nova revisão de custo, validação e experiência administrativa.
- Atualizar actions pinadas quando as versões oficiais migrarem integralmente para Node.js 24.
- Medir Lighthouse/Core Web Vitals novamente antes de uma abertura pública ou após mudanças relevantes de interface.

## Futuro — somente quando houver necessidade medida

- Múltiplos grupos ou comunidades; antes disso, adaptar o login para identificar a organização.
- Notificações push, segmentação avançada e estatísticas de leitura.
- Modo projetor.
- Sistema social, amigos, comentários e mensagens.
- Missões e objetivos que não conflitem com medalhas e rankings.
- Recuperação de conta por e-mail.
- Busca textual avançada/FTS quando o acervo ultrapassar o desempenho do índice atual.
- Curiosidades bíblicas contextuais na tela inicial, após definir curadoria e impacto de desempenho.

## Princípio de infraestrutura

Priorizar D1 e Pages Functions já existentes. Adicionar novos produtos Cloudflare ou serviços externos apenas depois de medir um gargalo real e confirmar que a alternativa permanece no plano gratuito.
