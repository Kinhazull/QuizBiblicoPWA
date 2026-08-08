# AGENTS.md — Regras obrigatórias para assistentes

## Fonte de verdade

Em caso de conflito:

1. código e migrations da branch atual;
2. decisões formais de arquitetura e produto;
3. `CURRENT_STATE.md`;
4. documentação técnica específica;
5. roadmap;
6. conversa ou memória do assistente.

`docs/AI/CURRENT_STATE.md` é a fonte oficial do estado operacional corrente. Documentos de release, auditorias e registros em `HISTORY/` são históricos e não substituem esse arquivo.

## Autorização e branch

- Por padrão, trabalhe em branch própria.
- Trabalho direto na `main` é permitido quando o proprietário do projeto autorizar explicitamente na tarefa corrente.
- Uma autorização para trabalhar na `main` não autoriza automaticamente commit, push, merge, deploy, migration remota ou escrita em produção.
- Ações sensíveis devem respeitar exatamente a autorização recebida. Não exigir nova confirmação para uma ação que já foi autorizada de forma clara e específica.

## Regras permanentes

- Não fazer deploy, merge, push, migration remota ou alteração de dados reais sem autorização explícita.
- Não ampliar escopo por iniciativa própria.
- Não remover testes ou proteções para fazer algo passar.
- O servidor é a fonte da verdade para valores persistentes.
- O cliente nunca concede XP, moedas, pontuação ou recompensas persistentes.
- Jornadas, Ranking e Medalhas pertencem exclusivamente ao Quiz Bíblico enquanto o legado estiver ativo.
- Conquistas da plataforma são separadas das Medalhas do Quiz.
- Mudanças arquiteturais exigem decisão formal.
- Conteúdo bíblico sugerido por IA entra como rascunho e exige revisão humana.
- Toda tarefa deve declarar objetivo, escopo, riscos, critérios de aceite e validações.

## Colaboração com IA

- ChatGPT e Codex podem analisar, planejar, documentar, implementar, testar e revisar quando isso fizer parte do pedido.
- Use apenas o contexto necessário, mas faça a inspeção ampla quando a própria tarefa exigir auditoria do repositório.
- Não delegue ao usuário ações locais seguras que a ferramenta possa executar dentro do escopo autorizado.
- Preserve a separação entre diagnóstico, implementação, validação e operação remota nos relatórios.

## Encerramento obrigatório

Ao concluir uma sprint ou decisão relevante:

- atualizar `CURRENT_STATE.md`;
- atualizar `HISTORY/`;
- atualizar `KNOWN_ISSUES.md` quando aplicável;
- atualizar `PROJECT_INDEX.md` quando novos pontos de entrada surgirem;
- registrar decisão formal quando houver impacto de arquitetura ou processo.
