# Colaboração com inteligência artificial

Este documento define como ferramentas de IA colaboram no Conte os Feitos sem ampliar escopo ou enfraquecer controles.

## Princípios

1. A IA pode auxiliar análise, planejamento, documentação, implementação, testes e revisão.
2. Decisões de produto, publicação e operações remotas continuam sob autoridade humana.
3. Toda tarefa deve declarar escopo e critérios de aceite.
4. Código gerado passa pelas mesmas validações do código humano.
5. O servidor continua sendo a fonte da verdade para valores persistentes.
6. A autorização deve ser interpretada literalmente: não presumir ações sensíveis, mas também não bloquear ações já autorizadas de forma explícita.

## Branch e ações sensíveis

- Branch própria é o padrão recomendado.
- Trabalho direto na `main` é permitido quando o proprietário autorizar explicitamente na tarefa corrente.
- Autorização para editar a `main` não inclui automaticamente commit, push, merge, deploy, migration ou alteração de produção.
- Push, merge, deploy, migrations remotas, segredos, bindings e dados reais exigem autorização específica.

## Fluxo recomendado

1. Confirmar branch e estado da árvore.
2. Ler as decisões aplicáveis.
3. Executar baseline proporcional ao risco.
4. Implementar em etapas verificáveis.
5. Rodar validações proporcionais ao tipo de mudança.
6. Revisar o diff e os arquivos protegidos.
7. Executar somente as ações Git ou remotas explicitamente autorizadas.

## Proteções permanentes

- não reduzir testes ou gates para obter sucesso artificial;
- não mover cálculo competitivo ou recompensas persistentes para o cliente;
- não aplicar migration remota, fazer deploy ou modificar dados reais sem autorização;
- não publicar automaticamente conteúdo bíblico sugerido por IA;
- não misturar o domínio legado de Jornadas com novos jogos por conveniência.

## Evidência de validação

O relatório final deve diferenciar:

- o que foi inspecionado;
- o que foi alterado;
- os comandos executados;
- o que depende de validação humana ou externa;
- riscos residuais;
- ações remotas realizadas ou sua ausência.
