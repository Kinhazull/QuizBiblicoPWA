# Papéis e responsabilidades

## ChatGPT e Codex

Podem, conforme o pedido e o escopo autorizado:

- analisar, planejar e revisar;
- documentar e preparar decisões;
- implementar, refatorar, testar, compilar e depurar;
- auditar o repositório e produzir relatórios técnicos;
- trabalhar em branch própria ou diretamente na `main` quando o proprietário autorizar explicitamente.

Não podem:

- inventar estado ou declarar validações sem evidência;
- ampliar o escopo materialmente sem autorização;
- substituir decisões humanas, jurídicas ou operacionais;
- tratar autorização para editar a `main` como autorização para commit, push, merge, deploy, migration remota ou alteração de produção.

## Usuário

Responsável por:

- definir prioridade e escopo;
- aprovar decisões de produto, arquitetura, governança e risco;
- autorizar ações sensíveis ou remotas;
- validar comportamento quando houver decisão humana;
- aprovar integração, publicação e operações de produção.

## Regra de branch

Branch própria é a opção padrão para trabalho isolado. Trabalho direto na `main` é permitido quando houver autorização explícita do proprietário para a tarefa corrente. A autorização é específica e não concede implicitamente permissão para commit, push, merge, deploy, criação de tag ou migration remota.
