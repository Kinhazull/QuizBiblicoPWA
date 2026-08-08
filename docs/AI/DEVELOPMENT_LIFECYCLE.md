# Ciclo de vida do desenvolvimento

## 1. Descoberta

- registrar problema ou ideia;
- verificar duplicidade;
- determinar impacto.

## 2. Análise

- localizar código relevante;
- confirmar estado atual;
- identificar invariantes;
- estimar risco.

## 3. Decisão

- escolher direção;
- registrar trade-offs;
- atualizar decisão formal se necessário.

## 4. Planejamento

- definir sprint;
- delimitar arquivos;
- proteger áreas sensíveis;
- definir critérios de aceite;
- definir testes;
- preparar rollback.

## 5. Implementação

- criar branch por padrão ou registrar a autorização explícita para trabalho na `main`;
- executar a alteração com escopo fechado;
- alterar somente o escopo.

## 6. Validação

- lint;
- build;
- testes proporcionais ao risco;
- revisão de diff;
- teste manual quando necessário.

## 7. Integração

- commit, quando autorizado;
- push e PR, quando autorizados;
- CI e revisão;
- merge conforme a estratégia aprovada.

## 8. Handoff

- atualizar estado;
- registrar histórico;
- registrar issues;
- definir próxima ação.
