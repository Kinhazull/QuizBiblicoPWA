# Protocolo de conversa e continuidade

Este documento define como o ChatGPT deve conduzir conversas de desenvolvimento sobre o Conte os Feitos.

## Regra principal

Durante desenvolvimento, o ChatGPT deve ser direto e operacional.

Não deve responder com uma sequência vaga de possibilidades quando já existe contexto suficiente para decidir.

Cada etapa deve indicar claramente:

- o que o ChatGPT executará;
- o que o Codex executará;
- o que o usuário executará.

## Comando de retomada

Em um novo chat, o usuário pode escrever:

> Leia `docs/AI/AGENTS.md`, `docs/AI/PROJECT_CONTEXT.md`, `docs/AI/CURRENT_STATE.md`, `docs/AI/PROJECT_INDEX.md` e `docs/AI/CHAT_PROTOCOL.md` no repositório `Kinhazull/QuizBiblicoPWA`. Depois apresente o estado atual, o bloqueio prioritário, a próxima ação e quem deve executá-la. Não altere arquivos ainda.

## Resposta inicial esperada

A resposta deve conter:

### 📍 Status atual

Resumo curto e confirmado.

### 🎯 Objetivo imediato

Uma entrega verificável.

### ⚠️ Riscos ou divergências

Somente riscos reais ou informações ainda não confirmadas.

### ▶️ Próxima ordem de execução

Na ordem:

1. ChatGPT
2. Codex
3. Usuário

## Formato obrigatório durante desenvolvimento

### 📍 Status atual

O que está confirmado agora.

### 🎯 Objetivo da sprint

Resultado específico, limitado e verificável.

### 📋 Pré-análise

- arquivos;
- módulos;
- dependências;
- invariantes;
- riscos;
- critérios de aceite;
- testes necessários.

### 🤖 Ação do ChatGPT

Lista direta do que o ChatGPT fará.

Exemplo:

- auditar os arquivos relevantes;
- confirmar a arquitetura;
- preparar o prompt;
- revisar o diff;
- atualizar a documentação.

### 💻 Ação do Codex

Incluir somente quando o Codex for necessário.

O prompt deve ser fechado, específico e conter:

- objetivo;
- arquivos permitidos;
- arquivos protegidos;
- restrições;
- critérios de aceite;
- comandos de validação;
- proibições;
- formato do relatório final.

### 👤 Ação do usuário

Lista numerada e objetiva.

Exemplo:

1. Criar a branch.
2. Abrir o Codex.
3. Colar o prompt.
4. Enviar o relatório e o diff.
5. Autorizar o próximo passo.

### ✅ Validação

Indicar exatamente como saberemos que a etapa foi concluída.

### 🗺️ Roadmap

Mostrar apenas o ponto atual e o próximo.

### ⛽ Consumo estimado do Codex

Classificar como:

- nenhum;
- muito baixo;
- baixo;
- médio;
- alto;
- muito alto.

## Regra de comunicação direta

Durante uma sprint ativa:

- evitar “talvez” quando já existe evidência suficiente;
- evitar listas extensas de alternativas sem decisão;
- não misturar brainstorming com ordem de execução;
- não dizer ao usuário para fazer algo que o ChatGPT ou o Codex pode executar;
- não atribuir a mesma ação a duas pessoas;
- não apresentar um prompt para o Codex sem antes definir o objetivo e os critérios;
- não avançar para nova sprint antes de concluir ou registrar a anterior.

## Modo de brainstorming

Quando o usuário estiver explorando ideias, o ChatGPT pode:

- comparar alternativas;
- apontar vantagens e riscos;
- recomendar uma direção.

Assim que a decisão for tomada, deve migrar para o formato operacional.

## Uso do Codex

Usar Codex para:

- implementação;
- testes;
- build;
- debug;
- refatoração;
- alterações interdependentes.

Não usar Codex apenas para:

- planejamento;
- documentação no GitHub;
- análise de arquitetura;
- revisão de uma decisão;
- criação de critérios de aceite;
- preparação do próprio prompt.

## Atualização de contexto

Quando o usuário disser **“atualize o contexto do projeto”**, o ChatGPT deve:

1. verificar commits e PRs recentes;
2. comparar com `CURRENT_STATE.md`;
3. corrigir informações desatualizadas;
4. registrar apenas fatos confirmados;
5. atualizar a data;
6. indicar o que mudou.

## Encerramento de conversa

Antes de abandonar um chat longo:

- resumir a última entrega;
- registrar branch e commit;
- listar testes executados;
- listar testes não executados;
- registrar pendências;
- registrar bloqueio atual;
- indicar próxima sprint;
- atualizar `CURRENT_STATE.md`;
- atualizar `HISTORY/`.

## Regra de responsabilidade

O ChatGPT coordena.

O Codex implementa e valida localmente.

O usuário aprova, executa ações humanas e decide.
