# AGENTS.md — Guia operacional para assistentes de IA

Este arquivo é o ponto de entrada obrigatório para qualquer assistente de IA que trabalhe no repositório **Conte os Feitos**.

## Ordem obrigatória de leitura

1. `AGENTS.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/CURRENT_STATE.md`
4. `docs/PROJECT_INDEX.md`
5. `docs/CHAT_PROTOCOL.md`
6. Documentação específica do módulo afetado
7. Código estritamente necessário para a tarefa

Não tente ler o repositório inteiro. Use o índice para localizar somente os módulos relevantes.

## Fonte de verdade

Em caso de conflito:

1. Código e migrations presentes na branch de trabalho
2. ADRs e decisões formais em `docs/PRODUCT/DECISION_LOG.md`
3. `docs/CURRENT_STATE.md`
4. Documentação técnica específica
5. `docs/PRODUCT/ROADMAP.md`
6. Conversas de chat, memórias ou suposições do assistente

Uma conversa nunca substitui uma decisão versionada no repositório.

## Regras permanentes

- Não trabalhar diretamente na `main`.
- Não fazer deploy, merge, push, migration remota ou alteração de dados reais sem autorização explícita.
- Não ampliar o escopo por iniciativa própria.
- Não remover testes ou proteções para fazer uma implementação passar.
- O servidor é a fonte da verdade para XP, moedas, recompensas, pontuação e progresso persistente.
- O cliente nunca concede XP ou outras recompensas persistentes.
- `GAME_FINISHED` é o evento canônico de conclusão de jogo.
- Jornadas, Ranking e Medalhas pertencem exclusivamente ao Quiz Bíblico.
- Conquistas da plataforma são separadas das Medalhas do Quiz.
- Mudanças arquiteturais exigem registro formal de decisão.
- Estatísticas devem continuar reconstruíveis.
- Consumidores e contratos de eventos devem permanecer versionados.
- Conteúdo bíblico sugerido por IA entra como rascunho e exige revisão humana.

## Forma de trabalhar

1. Confirmar objetivo, escopo e branch.
2. Ler `docs/CURRENT_STATE.md`.
3. Localizar arquivos relevantes em `docs/PROJECT_INDEX.md`.
4. Identificar invariantes e arquivos protegidos.
5. Propor implementação pequena e verificável.
6. Executar validações proporcionais ao risco.
7. Revisar o diff completo.
8. Relatar o que foi inspecionado, alterado, validado, não validado, riscos e rollback.

## Economia de contexto e cota

- Não faça exploração ampla sem necessidade.
- Não leia diretórios inteiros quando uma busca por símbolo resolve.
- Reutilize documentação versionada em vez de reconstruir o contexto.
- Separe investigação, planejamento e implementação.
- Assistentes de chat devem preparar a tarefa antes de encaminhá-la ao Codex.
- O Codex deve ser usado principalmente para implementação, testes e correções dependentes do ambiente local.

## Início de nova conversa

Quando o usuário disser “leia a documentação do projeto”:

1. Ler os cinco primeiros arquivos da ordem obrigatória.
2. Resumir o estado atual em até 15 linhas.
3. Informar prioridade, bloqueios e próxima ação recomendada.
4. Não propor implementação antes de confirmar que `CURRENT_STATE.md` está atualizado.
5. Perguntar somente diante de ambiguidade real não resolvível no repositório.

## Encerramento de sessão

Ao concluir uma sprint ou decisão relevante:

- atualizar `docs/CURRENT_STATE.md`;
- atualizar o roadmap apenas quando a ordem ou estado de fase mudar;
- registrar decisão arquitetural quando aplicável;
- atualizar `docs/PROJECT_INDEX.md` quando surgirem novos módulos ou pontos de entrada;
- deixar handoff suficiente para um novo chat continuar sem depender da conversa anterior.
