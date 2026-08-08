# Runbooks operacionais

Todos os procedimentos começam pelo diagnóstico administrativo e pelo `supportId`. Nunca editar ledger, status, saldo ou reservas diretamente.

| Incidente | Sintoma | Como confirmar | Ação segura | O que não fazer | Escalonamento |
|---|---|---|---|---|---|
| Schema divergente | DATABASE `CRITICAL` | contrato operacional + `verify-final` | executar reconciliação oficial em ambiente controlado | editar `sqlite_master` ou ledger | responsável por D1/migrations |
| Migration pendente | MIGRATIONS divergente | `verify-promotable` | backup e promoção controlada | marcar como aplicada sem SQL | responsável operacional |
| Outbox acumulando | backlog degradado/crítico | endpoint restrito da Outbox e idade | verificar Worker e executar dispatcher oficial | alterar `delivery_state` manualmente | Core Platform |
| Dead letters | `outbox.dead_letters` | consultar metadados sanitizados | identificar causa e usar reprocessamento aprovado | copiar payload para logs/tickets | Core Platform + segurança |
| Event Engine falhando | consumers em retry/dead letter | checkpoints e supportId | corrigir causa e usar retry oficial | conceder recompensa manualmente | dono do consumer |
| Evento não encerrado | Evento vencido ainda ACTIVE | EVENTS/WORKER | executar reconciliação existente | alterar status isoladamente | operações de Eventos |
| Reserva presa | reserva expirada/órfã | EVENTS e UNIVERSAL_LIBRARY | reconciliar Evento e conferir outras reservas | liberar conteúdo por SQL | operações de Eventos |
| Catálogo insuficiente | GENERATOR crítico | contagem por jogo/dificuldade | publicar/projetar conteúdo válido pelo CMS | reduzir regra ou criar seleção no health | editorial + plataforma |
| Seleção incompleta | seleção ativa sem itens | `generator.incomplete_selection` | preservar evidência e investigar geração | completar itens manualmente | plataforma |
| Histórico ausente | versão selecionada não resolve | `generator.missing_history` | restaurar versão pelo backup aprovado | usar versão atual no lugar | editorial + dados |
| Erro com supportId | mensagem genérica ao cliente | localizar mesmo ID nos logs | analisar operação/código público sem pedir dado pessoal | solicitar senha/token ou expor stack | componente responsável |
| Restore/backup | perda ou corrupção confirmada | contrato de backup e diagnóstico | validar backup, ensaiar restore isolado e obter aprovação | sobrescrever produção diretamente | incidente crítico/dono do projeto |

