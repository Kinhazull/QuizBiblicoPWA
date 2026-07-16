# Runbook do processamento de Jornadas

Para uma visão do fluxo completo entre Jornada aberta, Ranking provisório, encerramento e Medalhas, consulte [JOURNEY_LIFECYCLE.md](JOURNEY_LIFECYCLE.md).

## Funcionamento

O Worker `quiz-biblico-journey-awards` executa a cada minuto. Cada invocação processa no máximo sete participantes, limite conservador para o orçamento gratuito de consultas do D1. O checkpoint `(round_id, user_id, job_type)` torna a retomada idempotente.

O diagnóstico administrativo informa fila, participantes pendentes e estimativa em minutos. Para 200 participantes, a estimativa nominal é de aproximadamente 29 minutos, sem repetir participantes concluídos.

## Verificação normal

1. Cloudflare > Workers & Pages > `quiz-biblico-journey-awards`.
2. Em Triggers, confirme `* * * * *`.
3. Em Observability, procure `journey_awards_completed` sem `journey_awards_failed`.
4. No aplicativo, abra Painel > Diagnóstico e confirme fila zero após o prazo estimado.

## Alerta operacional

O catálogo de Notifications da conta gratuita foi verificado em 16/07/2026 e não oferece alerta de exceção por Worker. Portanto, não há uma configuração de e-mail nativa omitida pelo administrador. Até existir um monitor automatizado independente, o responsável deve acompanhar o diagnóstico do aplicativo e a área Observability do Worker, procurando `journey_awards_failed`, erros de invocação e fila sem progresso por mais de 15 minutos. O canal operacional acompanhado é `lucas.o.silva0105@gmail.com`.

Durante o piloto, faça essa conferência ao menos uma vez por dia e também após o encerramento de cada Jornada. O monitor externo por e-mail permanece no backlog futuro.

## Incidente

1. Não apague checkpoints nem linhas de auditoria.
2. Confirme o binding `DB` e a migration atual no diagnóstico.
3. Examine a mensagem estruturada do erro, sem copiar dados pessoais.
4. Corrija a causa e publique somente pelo workflow `Quality and security`.
5. Aguarde o próximo minuto; o processamento retoma do checkpoint.
6. Se uma fila real crescer por mais de 15 minutos sem progresso, trate como incidente de produção.

Nunca execute manualmente a premiação em SQL e nunca marque participantes como processados sem passar pela regra da aplicação.
