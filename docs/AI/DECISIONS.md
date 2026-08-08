# Decisões operacionais sobre IA

## DAI-001 — GitHub como memória operacional

**Status:** aceita

`docs/AI/CURRENT_STATE.md` é a fonte oficial do estado operacional corrente. Os demais arquivos de `docs/AI` detalham processo, decisões e histórico.

## DAI-002 — Capacidades flexíveis de colaboração

**Status:** aceita; substitui a divisão rígida anterior de responsabilidades.

ChatGPT e Codex podem analisar, planejar, documentar, implementar, testar, compilar, depurar e revisar quando essas ações fizerem parte do pedido. Não é obrigatório dividir artificialmente uma tarefa entre agentes.

## DAI-003 — Uso proporcional das ferramentas

**Status:** aceita; substitui a regra anterior de uso econômico restrito do Codex.

Ferramentas e validações devem ser proporcionais ao risco e ao escopo. Suítes extensas não devem ser executadas sem necessidade, mas não são omitidas quando forem critério de aceite.

## DAI-004 — Ferramentas externas fora do fluxo oficial

**Status:** aceita

Ferramentas externas não configuradas ou indisponíveis não fazem parte do fluxo obrigatório. Sua adoção exige decisão explícita.

## DAI-005 — Comunicação orientada ao resultado

**Status:** aceita; substitui a atribuição obrigatória de toda ação a ChatGPT, Codex e usuário.

Relatórios devem registrar resultado, evidência, riscos, pendências e ações que realmente dependem do usuário. Não é necessário criar seções artificiais para participantes sem ação.

## DAI-006 — Governança de branch e autoridade

**Status:** aceita em 2026-08-08.

Branch própria é o padrão. Trabalho direto na `main` é permitido mediante autorização explícita do proprietário. Essa autorização não inclui automaticamente commit, push, merge, deploy, tag, migration remota ou alteração de produção.

## DAI-007 — CF-POS como parte do processo oficial

**Status:** aceita

A pasta `docs/AI` define o sistema operacional de desenvolvimento do projeto, com `CURRENT_STATE.md` como fonte corrente e os arquivos `HISTORY` como memória histórica.
