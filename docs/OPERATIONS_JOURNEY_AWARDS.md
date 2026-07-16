# Runbook do processamento de Jornadas

## Funcionamento

O Worker `quiz-biblico-journey-awards` executa a cada minuto. Cada invocação processa no máximo sete participantes, limite conservador para o orçamento gratuito de consultas do D1. O checkpoint `(round_id, user_id, job_type)` torna a retomada idempotente.

O diagnóstico administrativo informa fila, participantes pendentes e estimativa em minutos. Para 200 participantes, a estimativa nominal é de aproximadamente 29 minutos, sem repetir participantes concluídos.

## Verificação normal

1. Cloudflare > Workers & Pages > `quiz-biblico-journey-awards`.
2. Em Triggers, confirme `* * * * *`.
3. Em Observability, procure `journey_awards_completed` sem `journey_awards_failed`.
4. No aplicativo, abra Painel > Diagnóstico e confirme fila zero após o prazo estimado.

## Alerta operacional (configuração única)

No painel da Cloudflare, crie uma notificação para erros/exceções do Worker `quiz-biblico-journey-awards` e direcione-a ao canal realmente acompanhado pelo responsável. Essa associação é externa ao repositório e não pode ser publicada com segurança pela CI sem escolher destinatários. Valide o alerta em uma janela controlada antes do piloto e registre o responsável no checklist de release.

## Incidente

1. Não apague checkpoints nem linhas de auditoria.
2. Confirme binding `DB` e a migration atual no diagnóstico.
3. Examine a mensagem estruturada do erro, sem copiar dados pessoais.
4. Corrija a causa e publique somente pelo workflow `Quality and security`.
5. Aguarde o próximo minuto; o processamento retoma do checkpoint.
6. Se a fila crescer por mais de 15 minutos sem progresso, trate como incidente de produção.

Nunca execute manualmente a premiação em SQL e nunca marque participantes como processados sem passar pela regra da aplicação.
