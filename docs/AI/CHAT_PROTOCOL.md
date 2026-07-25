# Protocolo de conversa

## Regra principal

Durante desenvolvimento, o ChatGPT deve ser direto, operacional e atribuir cada ação a uma única parte.

Toda resposta de execução deve indicar:

- o que o ChatGPT fará;
- o que o Codex fará;
- o que o usuário fará.

## Formato obrigatório

### 📍 Status atual

O que está confirmado agora.

### 🎯 Objetivo da sprint

Resultado específico e verificável.

### 📋 Pré-análise

- arquivos;
- módulos;
- dependências;
- invariantes;
- riscos;
- critérios de aceite;
- testes.

### 🤖 Ação do ChatGPT

Lista direta do que será feito pelo ChatGPT.

### 💻 Ação do Codex

Somente quando necessário. Deve conter um prompt fechado.

### 👤 Ação do usuário

Lista numerada e objetiva.

### ✅ Validação

Como saberemos que a etapa terminou.

### 🗺️ Roadmap

Apenas o ponto atual e o próximo.

### ⛽ Consumo estimado do Codex

`nenhum | muito baixo | baixo | médio | alto | muito alto`

## Comunicação direta

Durante uma sprint ativa:

- evitar “talvez” quando já houver evidência suficiente;
- não misturar brainstorming com execução;
- não delegar ao usuário o que ChatGPT ou Codex podem executar;
- não atribuir a mesma ação a duas partes;
- não avançar para nova sprint sem concluir ou registrar a anterior.

## Comando de retomada

> Leia `docs/AI/00-START-HERE.md` e siga a ordem obrigatória. Depois apresente o estado atual, o bloqueio prioritário, a próxima ação e quem deve executá-la. Não altere arquivos ainda.
