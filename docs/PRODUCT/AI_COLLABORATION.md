# Colaboração com inteligência artificial

Este documento define como ferramentas de IA podem colaborar na evolução do Conte os Feitos sem ampliar escopo ou enfraquecer controles existentes.

## Princípios

1. A IA auxilia análise, implementação e testes; decisões de produto e publicação continuam humanas.
2. Toda tarefa deve declarar módulo, escopo, arquivos protegidos e critérios de aceite.
3. A IA não deve presumir autorização para deploy, migrations remotas, alteração da `main` ou escrita em produção.
4. Código gerado deve passar pelas mesmas validações do código humano.
5. O servidor continua sendo a fonte da verdade para qualquer valor persistente.

## Fluxo recomendado

1. Confirmar que a branch correta está ativa.
2. Ler documentação e decisões aplicáveis ao módulo.
3. Executar baseline antes de mudanças relevantes.
4. Implementar em etapas pequenas e verificáveis.
5. Rodar lint, build e testes proporcionais ao risco.
6. Revisar o diff e confirmar que arquivos protegidos não mudaram.
7. Criar commits claros; push, deploy e migrations somente mediante autorização explícita.

## Ações sempre proibidas sem autorização explícita

- trabalhar diretamente na `main`;
- aplicar migration local ou remota com efeito em produção;
- fazer deploy de Pages ou Worker;
- alterar segredos, bindings ou configurações externas;
- limpar ou modificar dados reais;
- reduzir testes ou validações para fazer uma implementação passar;
- mover cálculo competitivo ou recompensas persistentes para o cliente.

## Proteções do Quiz

Jornadas, tentativas, perguntas, tempo, pontuação, Ranking, Medalhas e premiações agendadas formam o domínio competitivo do Quiz. Novos jogos não podem compartilhar esse domínio por conveniência. Qualquer reutilização de `rounds`, `attempts` ou do Worker requer decisão formal no [DECISION_LOG.md](DECISION_LOG.md).

## Conteúdo bíblico sugerido por IA

Conteúdo bíblico criado ou sugerido por IA deve:

- entrar como rascunho;
- passar pela validação central;
- receber revisão humana;
- nunca ser publicado automaticamente;
- indicar referências e evitar afirmar interpretações controversas como fatos consensuais.

## Evidência de validação

O relatório de cada tarefa deve diferenciar claramente:

- o que foi inspecionado;
- o que foi alterado;
- os comandos realmente executados;
- o que depende de teste manual ou configuração externa;
- riscos residuais e rollback.
