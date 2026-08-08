# Promoção segura das migrations do D1

O workflow manual **Reconcile production D1 migrations** promove migrations oficiais pendentes sem publicar Pages ou Worker.

## Proteções existentes

Antes de escrever, o fluxo:

1. exige confirmação operacional explícita;
2. aceita execução somente pela referência e environment aprovados;
3. valida que o ledger remoto é prefixo exato e ordenado do catálogo local;
4. valida o schema correspondente às migrations aplicadas;
5. cria snapshot e backup remoto criptografado;
6. repete o preflight imediatamente antes da escrita.

Depois da promoção:

1. executa `verify-final`;
2. confirma ledger e schema completos;
3. aceita somente objetos criados ou modificados pelas migrations promovidas;
4. bloqueia alterações inesperadas, remoções e regressões de linhas;
5. executa a comparação com o snapshot anterior.

Quando não há migrations pendentes, `verify-promotable` considera o estado válido. A aplicação informa `No migrations to apply`, e `verify-final` e `compare` continuam protegendo o fluxo.

## Contrato obrigatório para toda nova migration

Toda migration deve declarar na documentação da sprint ou no metadado canônico utilizado pelo reconciliador:

| Campo | Obrigatório |
| --- | --- |
| nome e número sequencial | sim |
| objetos criados | sim, mesmo que vazio |
| objetos alterados/recriados | sim, mesmo que vazio |
| índices criados ou alterados | sim |
| triggers criados ou alterados | sim |
| schema anterior esperado | sim |
| teste sobre banco vazio | sim |
| teste sobre o estado imediatamente anterior | sim |
| comportamento em reaplicação/verificação | sim |
| impacto no reconciliador | sim |
| mudanças esperadas no snapshot/compare | sim |
| estratégia de recuperação/rollback | sim |

Migrations já publicadas são imutáveis. Correções persistentes usam nova migration aditiva.

## Validação local mínima

1. aplicar todas as migrations em banco vazio;
2. montar o schema imediatamente anterior;
3. aplicar somente a nova migration sobre esse estado;
4. confirmar tabelas, colunas, índices, triggers e constraints;
5. executar contratos de migrations e reconciliador;
6. confirmar que nenhuma estrutura anterior foi removida sem decisão formal;
7. confirmar como o snapshot classificará objetos criados e alterados.

## Ordem operacional oficial

```text
código/migration
→ validação local sobre schema anterior
→ commit
→ Quality gate
→ backup
→ verify-promotable
→ promoção controlada
→ verify-final
→ compare
→ somente depois ativação funcional
```

A funcionalidade não deve assumir que a migration está disponível em produção antes da conclusão de `verify-final` e `compare`.

## Recuperação

D1 não deve depender de rollback destrutivo improvisado. A estratégia deve priorizar:

- migration aditiva corretiva;
- restauração validada do backup quando houver perda ou corrupção;
- feature flag ou compatibilidade de leitura durante promoção em etapas;
- preservação do ledger real, sem marcação manual de migration como aplicada.

## Processo manual

1. integrar e validar a migration;
2. abrir **Actions → Reconcile production D1 migrations**;
3. selecionar a referência aprovada;
4. informar a confirmação exigida pelo workflow;
5. revisar banco, conta, migration pendente e backup;
6. aguardar preflight, aplicação, `verify-final` e `compare`;
7. somente depois autorizar deploy ou ativação funcional.

## Regras permanentes

- não desativar `verify-promotable`, `verify-final` ou `compare` para promover uma migration;
- não editar manualmente o ledger remoto;
- não marcar SQL como aplicado sem execução real;
- não concatenar migration e deploy como forma de contornar o gate;
- não executar operação remota sem autorização explícita;
- manter backup obrigatório quando houver escrita remota.

## Contrato da migration 0037

- schema anterior: `0036_platform_events.sql`;
- tabelas criadas: `content_review_comments`, `asset_registry`, `content_assets`;
- tabelas alteradas: `content_items` (estado editorial, submissão, revisão e rollback) e `platform_events` (`cover_asset_id` opcional);
- índices: estado editorial, comentários, assets por estado/URL e relação asset–conteúdo;
- triggers: nenhum;
- dados existentes: `editorial_status` é inicializado a partir de `status`, sem alterar payload ou versões;
- snapshot: tabelas e índices novos são criações esperadas; `content_items` e `platform_events` são alterações esperadas da 0037;
- recuperação: backup obrigatório e, se necessário, migration aditiva corretiva ou restauração validada; nunca editar ledger manualmente.
