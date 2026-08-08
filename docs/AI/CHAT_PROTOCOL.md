# Protocolo de conversa

## Regra principal

Durante o desenvolvimento, a comunicação deve ser direta, verificável e proporcional ao pedido.

Uma resposta de execução deve apresentar somente o que for relevante, normalmente:

- resultado ou estado atual;
- alterações realizadas;
- validações e evidências;
- riscos e pendências;
- ação humana necessária, quando existir.

Não é obrigatório separar ações entre ChatGPT e Codex. Ambos podem atuar em análise, documentação, implementação e validação dentro do escopo autorizado.

## Comunicação durante uma sprint

- evitar incerteza artificial quando houver evidência suficiente;
- distinguir diagnóstico, decisão e execução;
- não delegar ao usuário ações locais seguras que possam ser concluídas pelo agente;
- não avançar para nova sprint sem concluir ou registrar a anterior;
- pedir autorização específica para operações remotas, destrutivas ou de produção;
- registrar quando a execução direta na `main` tiver sido expressamente autorizada.

## Formato sugerido

1. resultado;
2. arquivos ou áreas afetadas;
3. validações;
4. riscos e pendências.

O formato pode ser reduzido ou expandido conforme o pedido do usuário.

## Comando de retomada

> Leia `docs/AI/00-START-HERE.md` e siga a ordem indicada. Depois apresente o estado atual, o bloqueio prioritário e a próxima ação. Não altere arquivos até que o pedido autorize execução.
