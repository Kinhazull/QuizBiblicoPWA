# Editor Visual de Eventos

## Objetivo

O editor administrativo em `/admin/eventos` traduz controles visuais para o mesmo contrato de Evento já aceito por `POST /api/admin/events` e `PATCH /api/admin/events/:id`. Ele não persiste estado próprio, não cria um segundo domínio e não altera o Event Engine.

## Fluxo

1. **Informações:** título e descrição; o backend cria o identificador e mantém o status `DRAFT`.
2. **Jogos:** seleção fechada dos sete módulos registrados; IDs arbitrários não são aceitos.
3. **Conteúdos:** consulta o Catálogo Elegível por organização, jogo, dificuldade e busca textual; reservados e arquivados são informados, mas não selecionáveis.
4. **Regras:** `ALL` ou `MINIMUM`, com limites coerentes com os jogos escolhidos.
5. **Recompensas:** XP/moedas já suportados e limites técnicos existentes; valores altos exibem alerta editorial, sem criar nova política econômica.
6. **Aparência:** seleção opcional de asset `ACTIVE` da organização pelo Asset Registry; não aceita URL arbitrária.
7. **Revisão:** resumo legível com retorno à etapa correspondente.
8. **Agendamento:** início, término e fuso; permite salvar `DRAFT` ou validar e agendar.

Criar e editar usam o mesmo componente. Somente Eventos `DRAFT` são editáveis, conforme o contrato preexistente.

## Mapeamento para contratos existentes

| Editor | Contrato atual |
|---|---|
| Informações/agendamento | `platform_events` por `createPlatformEvent`/`updatePlatformEvent` |
| Jogos | `GameType` e validação fechada de `parseGames` |
| Conteúdos | Biblioteca → Catálogo Elegível → `platform_event_content_items` |
| Regras/recompensas | campos e limites de `normalizeEvent` |
| Aparência | `coverAssetId` validado contra `asset_registry` da organização |
| Revisão final | `validatePlatformEvent` |
| Agendamento/reservas | `schedulePlatformEvent` e `platform_event_content_reservations` |

## Validações e concorrência

O cliente impede avanço quando faltam título, jogo, quantidade exigida de conteúdo ou janela temporal válida. O servidor permanece autoridade final para tipos, limites, organização, asset, elegibilidade e reservas.

No agendamento, `validatePlatformEvent` reconsulta conteúdo publicado, projeção e sobreposição temporal. Se outro Evento reservar um item após a abertura do editor, o agendamento é recusado e o administrador deve revisar Conteúdos. Reservas concorrentes nunca são sobrescritas pelo cliente.

## Limitações intencionais

- não há autosave nem persistência de progresso do wizard;
- busca trabalha sobre até 200 candidatos elegíveis por jogo, limite operacional já suportado;
- o aviso econômico não substitui uma política editorial de recompensas, ainda dependente de decisão do proprietário;
- não há calendário, recorrência, templates, clonagem, Analytics por etapa ou colaboração simultânea;
- a Sprint 26.4 recebe planejamento/calendário; automações permanecem para 26.6.
