# Planejamento e Calendário Administrativo

## Objetivo

`/admin/calendario` é a visão operacional de Eventos da plataforma. Ela não é uma agenda pessoal, não cria tarefas e não substitui o Editor Visual de Eventos.

## Fontes e estados

A leitura agrega `platform_events`, jogos, conteúdos selecionados, reservas ativas, CMS Universal e sinais determinísticos da Biblioteca Inteligente. Exibe `DRAFT`, `SCHEDULED`, `ACTIVE`, `FINISHED` e `CANCELLED`; por padrão, consulta rascunhos, agendados e ativos. Cada estado possui texto, sem depender apenas de cor.

O endpoint `GET /api/admin/planning/calendar` exige `events.manage`, deriva a organização da sessão, é somente leitura, usa `no-store, private`, limita o intervalo a 184 dias e retorna no máximo 100 Eventos. Consultas agregadas evitam N+1 e não carregam payloads editoriais nem dados pessoais.

## Timezone e período

Datas são apresentadas no `time_zone` do Evento; o padrão operacional, quando o período está vazio, é `America/Sao_Paulo`. O calendário compara chaves de dia produzidas com `Intl.DateTimeFormat` no fuso explícito, inclusive para Eventos que atravessam dias ou meses.

## Checklist derivado

“O que falta preparar?” não possui persistência. Ele é recalculado a partir de jogos, mínimo de conteúdos definido pelas capacidades universais, publicação/projeção/disponibilidade, datas e conflitos reais de reservas. Quando não há pendências, o Evento aparece como “Pronto para execução”. Capa continua opcional no contrato atual e, portanto, sua ausência não é tratada como erro.

## Reservas e necessidades editoriais

Reservas são agrupadas por Evento e jogo; IDs e centenas de itens individuais não são enviados à interface. Conflitos só são sinalizados quando registros de reserva realmente se sobrepõem. A área editorial mostra quantidade em revisão e até seis alertas críticos/de atenção já produzidos pela Biblioteca Inteligente.

## Limitações

- A janela informativa sem programação é de 14 dias e não representa erro.
- Não há drag-and-drop, lembretes, sincronização externa ou automação.
- A Sprint 26.4 apenas visualiza e conecta problemas. Automação e recomendações pertencem à Sprint 26.6 ou posterior.
- O calendário legado de rodadas permanece acessível diretamente enquanto sua retirada não for autorizada, mas não é mais a navegação principal.
