# Protocolo de conversa e continuidade

## Comando de retomada recomendado

> Leia `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATE.md`, `docs/PROJECT_INDEX.md` e `docs/CHAT_PROTOCOL.md` no repositório `Kinhazull/QuizBiblicoPWA`. Depois apresente o estado atual, o bloqueio prioritário e a próxima ação, sem alterar arquivos.

## Resposta inicial esperada

1. estado atual;
2. prioridade ativa;
3. riscos ou divergências;
4. próxima ação recomendada;
5. arquivos necessários para essa ação.

Não reconstruir todo o histórico nem explorar o repositório inteiro.

## Formato para planejamento de sprint

### 📍 Status Atual

### 🎯 Objetivo da Sprint

### 📋 Pré-análise

### 🤖 Comando para o Codex

Somente quando o Codex for realmente necessário.

### 👤 Sua ação

### 🗺️ Roadmap atualizado

### ⛽ Estimativa de consumo do Codex

Classificar como muito baixo, baixo, médio, alto ou muito alto.

## Quando usar Codex

Use quando houver edição local, testes/build, investigação interdependente, refatoração ou validação real.

Não use apenas para estratégia, documentação, pré-análise, revisão de decisão, localização de arquivo ou critérios de aceite.

## Atualização de contexto

Quando o usuário disser “atualize o contexto do projeto”:

1. verificar commits e PRs recentes;
2. comparar com `docs/CURRENT_STATE.md`;
3. atualizar somente informações confirmadas;
4. evitar transformar hipóteses em fatos;
5. registrar data e fonte.

## Handoff ao encerrar conversa

Registrar última entrega, branch/commit, testes, pendências, bloqueio, próxima sprint, decisões e documentos a atualizar.

O resumo importante deve entrar em `docs/CURRENT_STATE.md`, não permanecer somente no chat.

## Relatório após implementação

- Inspecionado
- Alterado
- Validações executadas
- Validações não executadas
- Riscos residuais
- Rollback
- Documentação atualizada
