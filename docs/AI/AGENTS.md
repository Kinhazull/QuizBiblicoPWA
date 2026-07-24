# AGENTS.md — Entrada obrigatória para assistentes de IA

Este documento é o ponto de entrada oficial para qualquer assistente de IA que trabalhe no projeto **Conte os Feitos**.

## Ordem obrigatória de leitura

Antes de analisar, planejar ou propor alterações:

1. `docs/AI/AGENTS.md`
2. `docs/AI/PROJECT_CONTEXT.md`
3. `docs/AI/CURRENT_STATE.md`
4. `docs/AI/PROJECT_INDEX.md`
5. `docs/AI/CHAT_PROTOCOL.md`
6. Documentação específica do módulo afetado
7. Código estritamente necessário para a tarefa

Não leia o repositório inteiro por padrão. Use o índice para localizar somente o contexto necessário.

## Fonte de verdade

Em caso de conflito, siga esta precedência:

1. Código e migrations da branch atual
2. Decisões formais em `docs/PRODUCT/DECISION_LOG.md`
3. `docs/AI/CURRENT_STATE.md`
4. Documentação técnica específica
5. `docs/PRODUCT/ROADMAP.md`
6. Conversas de chat, memória do assistente ou suposições

Conversas não substituem decisões versionadas no repositório.

## Regras permanentes

- Não trabalhar diretamente na `main`.
- Não fazer deploy, merge, push, migration remota ou alteração de dados reais sem autorização explícita.
- Não ampliar o escopo por iniciativa própria.
- Não remover testes ou proteções para fazer uma implementação passar.
- O servidor é a fonte da verdade para XP, moedas, recompensas, pontuação e progresso persistente.
- O cliente nunca concede recompensas persistentes.
- Jornadas, Ranking e Medalhas pertencem exclusivamente ao Quiz Bíblico.
- Conquistas da plataforma são separadas das Medalhas do Quiz.
- Mudanças arquiteturais exigem decisão formal registrada.
- Conteúdo bíblico sugerido por IA entra como rascunho e exige revisão humana.
- Toda tarefa deve declarar objetivo, escopo, riscos, arquivos afetados e critérios de aceite.

## Responsabilidades oficiais

### ChatGPT

Responsável por:

- planejamento;
- arquitetura;
- auditoria;
- documentação;
- análise de impacto;
- revisão de código, commits e pull requests;
- preparação de prompts para o Codex;
- atualização de contexto e handoff.

Não deve:

- inventar estado do projeto;
- assumir que algo foi implementado sem verificar;
- transformar hipótese em fato;
- autorizar deploy, migration ou merge por conta própria.

### Codex

Responsável por:

- implementação;
- refatoração;
- testes;
- build;
- debug;
- validação no ambiente local.

Não deve:

- redefinir arquitetura;
- ampliar escopo;
- alterar roadmap por iniciativa própria;
- fazer deploy, merge, push ou migration sem autorização explícita;
- explorar o repositório inteiro quando o escopo já estiver definido.

### Usuário

Responsável por:

- aprovar decisões;
- validar comportamento;
- executar ações humanas;
- autorizar deploy, merge, push e migrations;
- informar prioridades;
- interromper o fluxo quando o resultado divergir do objetivo.

## Fluxo obrigatório de trabalho

1. Confirmar objetivo e estado atual.
2. Ler o contexto mínimo necessário.
3. Fazer pré-análise.
4. Definir claramente:
   - ação do ChatGPT;
   - ação do Codex;
   - ação do usuário.
5. Implementar em etapas pequenas.
6. Executar validações proporcionais ao risco.
7. Revisar o diff completo.
8. Atualizar documentação e handoff.
9. Registrar pendências e riscos residuais.

## Economia de contexto e cota

- Não reconstruir o histórico inteiro a cada conversa.
- Não pedir ao Codex para “entender todo o projeto”.
- Não usar Codex para tarefas que o ChatGPT pode resolver no GitHub.
- Separar investigação, planejamento, implementação e revisão.
- Preparar prompts fechados e objetivos.
- Limitar a leitura aos arquivos necessários.
- Atualizar `CURRENT_STATE.md` ao final de cada etapa relevante.

## Início de uma nova conversa

Quando o usuário pedir para “ler a documentação do projeto”, o assistente deve:

1. Ler os cinco arquivos obrigatórios.
2. Resumir o estado atual em até 15 linhas.
3. Informar:
   - prioridade ativa;
   - bloqueios;
   - riscos;
   - próxima ação;
   - quem deve executá-la.
4. Não propor implementação antes de confirmar que o estado está atualizado.
5. Fazer perguntas somente quando houver ambiguidade real.

## Encerramento de sessão

Antes de encerrar um chat longo ou uma sprint:

- atualizar `docs/AI/CURRENT_STATE.md`;
- atualizar `docs/AI/HISTORY/`;
- atualizar `docs/AI/PROJECT_INDEX.md` quando necessário;
- registrar decisões relevantes;
- deixar um handoff suficiente para outro chat continuar sem depender da conversa anterior.
