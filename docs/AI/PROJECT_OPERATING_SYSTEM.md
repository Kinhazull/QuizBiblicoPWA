# Conte os Feitos Project Operating System

## Missão

Desenvolver o Conte os Feitos de forma sustentável, previsível e documentada, com contexto e validações proporcionais ao risco.

## Princípios operacionais

1. O projeto não depende da memória de uma IA.
2. Decisões importantes são versionadas.
3. O código prevalece sobre a conversa.
4. A documentação corrente prevalece sobre a memória.
5. A decisão formal prevalece sobre opinião informal.
6. Toda sprint possui objetivo e limites claros.
7. ChatGPT e Codex podem atuar em todo o ciclo quando solicitado.
8. Branch própria é o padrão; trabalho na `main` requer autorização explícita.
9. Autorização para editar não autoriza commit, push, deploy, tag ou migration remota.
10. Deploy, migrations remotas e alterações de produção exigem autorização humana específica.

## Estados operacionais

- **L0 — Brainstorm:** ideias e exploração.
- **L1 — Análise:** diagnóstico e levantamento.
- **L2 — Arquitetura:** decisões e impactos.
- **L3 — Planejamento:** sprint e critérios.
- **L4 — Implementação:** alteração e validação.
- **L5 — Revisão:** diff, testes e riscos.
- **L6 — Integração:** commit, CI, merge e publicação conforme autorização.
- **L7 — Handoff:** documentação e continuidade.

Os estados orientam o processo, mas podem ser combinados quando o pedido autorizar claramente uma execução completa.

## Regra do escopo

Evitar misturar sem decisão explícita:

- feature e refatoração ampla;
- bugfix e redesign;
- migration e alteração visual;
- hardening e nova funcionalidade;
- deploy e investigação.

## Regra da documentação

Nenhuma decisão importante pode existir apenas no chat. O estado corrente deve ser consolidado em `docs/AI/CURRENT_STATE.md`; decisões e histórico permanecem em seus documentos próprios.
