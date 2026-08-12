# Automação Administrativa

**Status:** implementada localmente na Sprint 26.6

## Contrato

A Central Administrativa deriva recomendações determinísticas, explicáveis e restritas à organização autenticada. Ela não executa ações, não usa IA e não persiste o resultado das regras. Cada recomendação informa severidade, domínio, motivo factual, entidade, próxima ação humana, destino e instante do cálculo.

Ordenação: severidade (`CRITICAL`, `ATTENTION`, `INFO`), proximidade temporal e identificador estável. A identidade determinística deduplica uma mesma causa durante a consulta.

## Catálogo de regras

| Domínio | Regra | Severidade | Fonte | Explicação/ação |
|---|---|---|---|---|
| Eventos | Evento próximo não está pronto | `CRITICAL` se começar em até 2 dias; senão `ATTENTION` | checklist do Planejamento, que reutiliza contratos do Evento | agrega as pendências do Evento em uma única recomendação e aponta para o Editor |
| Eventos | Capa opcional ausente | `INFO` | Evento/Asset Registry | sugere avaliar uma capa, sem torná-la obrigatória |
| Eventos | Asset de capa não ativo | acompanha a proximidade do Evento | Evento/Asset Registry | sugere selecionar asset ativo ou remover a capa |
| Eventos | Recompensa editorialmente alta | `ATTENTION` | configuração persistida do Evento | aparece quando qualquer valor alcança 80% do máximo permitido pelo contrato |
| Conteúdo | catálogo pequeno, concentração, dificuldade, baixo uso, sobreuso, projeção ausente ou reservas relevantes | severidade original | Biblioteca Inteligente | reutiliza integralmente o insight e a recomendação editorial existente |
| Conteúdo | fila `IN_REVIEW` não vazia | `ATTENTION` | CMS Universal | direciona à fila de revisão; não inventa tempo parado |
| Planejamento | nenhum Evento nos próximos 14 dias | `INFO` | Calendário | informa a lacuna sem presumir que deve existir Evento |
| Operações | grupo operacional degradado ou crítico | correspondente ao Health | Operational Health | apresenta a descrição sanitizada e direciona ao Diagnóstico |
| Operações | acessos pendentes | `ATTENTION` | usuários da organização | direciona à revisão de acessos |

## Thresholds

- Evento próximo: 7 dias.
- Evento criticamente próximo: 2 dias.
- Recompensa alta: 80% do máximo validado pelo contrato de Eventos.
- Biblioteca: thresholds canônicos de `LIBRARY_HEALTH_THRESHOLDS`; não são duplicados pela automação.
- Analytics: não gera recomendação nesta versão. As comparações atuais não oferecem, em todos os domínios, amostra e atribuição uniformes suficientes para transformar variação em ação administrativa segura.

## Segurança e performance

- Endpoint existente: `GET /api/admin/dashboard`, protegido por permissão administrativa e `organizationId` da sessão.
- Resposta `no-store, private`, sem PII ou payload editorial completo.
- Queries parametrizadas e agregadas; nenhum `organizationId` aceito do cliente.
- O Planejamento calcula a Biblioteca uma vez e expõe o mesmo resultado para a Central, evitando recalcular as regras.
- Não existe N+1 por Evento, escrita, migration, cron ou notificação externa.

## Limitações e decisões humanas

Não existem dispensar, adiar ou resolver persistentes. Essa necessidade fica para avaliação futura. Recomendações não alteram conteúdo, dificuldade, publicação, reservas, Eventos, recompensas ou assets. Nenhuma recomendação é transformada automaticamente em notificação; a Central é o único canal desta sprint.
