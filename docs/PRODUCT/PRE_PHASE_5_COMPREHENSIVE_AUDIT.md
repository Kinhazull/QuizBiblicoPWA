# Relatório consolidado de auditoria pré-Fase 5

**Projeto:** Conte os Feitos  
**Data da auditoria:** 03/08/2026  
**Branch examinada:** `main`  
**HEAD examinado:** `2cb5313` — `close phase 4 release candidate`  
**Finalidade:** fornecer uma base técnica independente para avaliação pelo ChatGPT antes do início da Fase 5.

## 1. Resumo executivo

A plataforma concluiu a Fase 4 com uma base funcional ampla: CMS Universal, Biblioteca Universal, Gerador Universal, modos `FREE_PLAY`, `DAILY` e `EVENT`, sete jogos, progressão, economia, missões, conquistas, administração e mecanismos de publicação e reconciliação de migrations.

A auditoria não encontrou evidência de uma falha arquitetural central que impeça o início da Fase 5. Entretanto, encontrou débitos relevantes em quatro áreas:

1. ferramentas operacionais que não acompanharam integralmente a evolução até a migration 0036;
2. privacidade, retenção e recuperação de dados ainda baseadas em uma plataforma anterior;
3. convivência prolongada entre a plataforma universal e estruturas do Quiz competitivo legado;
4. governança do repositório, versionamento e documentação que já não representam corretamente o produto atual.

Os riscos mais importantes não estão na capacidade de jogar, mas na capacidade de diagnosticar, recuperar, limpar, auditar e operar a plataforma com segurança.

## 2. Escopo e metodologia

Foram examinados:

- estado atual da `main`;
- 123 commits alcançáveis pelas referências Git;
- branches e tags locais e remotas;
- histórico de arquivos criados, removidos e renomeados;
- migrations 0000–0036 e histórico do reconciliador;
- workflows de qualidade, deploy, D1 e limpeza do piloto;
- documentação de arquitetura, produto, operação, IA e backlog;
- APIs administrativas, privacidade, backup, diagnóstico e notificações;
- Worker agendado;
- estruturas do CMS, Biblioteca, Gerador, modos e Eventos;
- artefatos históricos e lockfiles rastreados.

A auditoria foi somente leitura. Não foram executados deploy, migration remota, escrita em banco, commit ou alteração funcional.

## 3. Situação geral da plataforma

### 3.1 Capacidades consolidadas

- autenticação e autorização;
- administração existente e navegação administrativa unificada;
- CMS Universal com conteúdo versionado e publicação;
- Biblioteca Universal como projeção dos conteúdos publicados;
- Catálogo Elegível e Gerador Universal;
- Game Loader e providers por modo;
- sete jogos integrados;
- modos Livre, Diário e Evento;
- Event Engine e consumers de Progress, Statistics, Reward, Achievement e Mission;
- XP, nível, moedas, retenção, Loja, inventário e equipamentos;
- transactional outbox e dispatcher para o Quiz;
- migrations aditivas e reconciliador de D1;
- desenvolvimento local e LAN sem acesso ao banco de produção;
- testes unitários, integração, contratos, Playwright e validações de build.

### 3.2 Situação do legado

A plataforma universal está ativa, mas ainda convive com:

- Jornadas/Rodadas;
- Ranking e Medalhas;
- tabelas `rounds`, `attempts`, `attempt_answers`, `user_badges` e relacionadas;
- Worker denominado `journey-awards`;
- notificações centradas em Medalhas;
- permissões herdadas de `leader`;
- adaptador e fallback transitório do Quiz legado;
- rotas e páginas administrativas do sistema anterior.

Essa convivência foi deliberada para preservar histórico e permitir rollback. O risco está em ela permanecer indefinidamente sem critérios objetivos de retirada.

## 4. Achados críticos ou de alta prioridade

### 4.1 Backup incompleto para a plataforma atual

O backup administrativo ainda usa uma versão de schema próxima da Foundation inicial e não representa integralmente as estruturas introduzidas nas migrations posteriores.

Não estão claramente incluídas todas as estruturas de:

- Biblioteca Universal;
- seleções geradas e seus itens;
- participações e controle idempotente de uso;
- Eventos;
- jogos e conteúdos reservados em Eventos;
- participações e recompensas de Eventos;
- alguns dados operacionais da outbox.

**Risco:** um backup pode ser considerado válido e ainda não permitir a recuperação integral da plataforma.

**Decisão necessária:** diferenciar formalmente exportação administrativa, backup organizacional e backup integral restaurável. Depois, testar restauração num D1 separado.

### 4.2 Exportação e exclusão de dados pessoais incompletas

A exportação de privacidade contempla diversas informações históricas e do Core, mas não cobre de forma inequívoca todos os dados atuais, como:

- XP, moedas e ledgers;
- compras, propriedade e equipamentos;
- retenção diária, sequência e cofre;
- seleções e participações geradas;
- Eventos, participações e recompensas;
- autoria ou revisão de conteúdos, quando aplicável.

Também falta uma matriz explícita para anonimização ou exclusão dessas estruturas.

**Risco:** divergência entre o produto real, os Termos/Privacidade e o conteúdo entregue numa solicitação de dados.

### 4.3 Diagnóstico administrativo desatualizado

O diagnóstico de saúde ainda possui referências canônicas próximas das migrations 0027/0028. Ele não valida integralmente estruturas e processos até 0036.

Pode deixar de detectar:

- ausência ou divergência no CMS/Biblioteca;
- projeção incompleta;
- seleções ou participações paralisadas;
- reservas de Evento vencidas;
- inconsistências das tabelas de Eventos;
- catálogo oficial insuficiente por jogo;
- dead letters ou consumidores sem avanço.

**Risco:** o painel declarar o sistema saudável apesar de uma parte importante da Fase 4 estar indisponível.

**Sugestão técnica:** o diagnóstico deve consumir a mesma fonte canônica do reconciliador, evitando listas duplicadas de tabelas e índices.

### 4.4 Encerramento de Eventos dependente de tráfego

O Worker agendado executa premiações legadas, dispatcher da outbox e retry de eventos do Core. A reconciliação dos Eventos da plataforma não está explicitamente incluída nesse ciclo.

O encerramento pode acontecer durante chamadas às APIs. Sem tráfego após o horário final, um Evento pode continuar mantendo conteúdos reservados até uma nova leitura provocar a reconciliação.

**Risco:** conteúdos permanecem indisponíveis para Livre e Diário além do prazo esperado.

**Sugestão técnica:** reconciliação agendada, independente, idempotente, observável e com tratamento de erro isolado.

### 4.5 Limpeza do piloto não cobre toda a Fase 4

A política de limpeza foi criada antes das últimas estruturas universais e de Eventos. Ela pode preservar indevidamente:

- seleções e itens gerados;
- participações e usos;
- Eventos e reservas;
- recompensas de Eventos;
- estados recentes de retenção ou economia, dependendo da política desejada.

**Risco:** novos ciclos de teste iniciarem com dados residuais invisíveis.

Antes de alterar o script, é necessário decidir quais registros devem ser mantidos por idempotência, auditoria ou histórico.

## 5. Operação, observabilidade e crescimento dos dados

### 5.1 Alertas operacionais insuficientes

Existem logs e tratamentos independentes, mas não foi encontrada uma cobertura operacional completa para alertar sobre:

- Cron sem executar;
- outbox ou dead letter parada;
- consumer sem avanço;
- projeção da Biblioteca divergente;
- reservas de Evento vencidas;
- catálogo elegível insuficiente;
- falhas repetidas do Gerador;
- backlog de premiações legadas.

É recomendável definir indicadores, limiares, responsável e runbook antes de depender de usuários para perceber falhas.

### 5.2 Retenção dos dados operacionais não formalizada

A plataforma acumula eventos, receipts, outbox, seleções, participações, ledgers, auditoria e histórico de Eventos. Ainda não existe uma política técnica única que defina:

- por quanto tempo cada estrutura permanece online;
- o que pode ser arquivado;
- o que deve ser preservado para idempotência;
- o que pode ser anonimizado;
- como reconstruir projeções após limpeza;
- quando executar jobs de retenção.

### 5.3 APIs com sanitização desigual de erros

Alguns endpoints recentes capturam exceções e retornam diretamente `error.message`. Erros de domínio podem ser públicos, mas exceções inesperadas de D1 ou infraestrutura não deveriam chegar ao cliente.

Recomenda-se:

- erros de domínio tipados;
- allowlist de códigos públicos;
- `supportId` para falhas inesperadas;
- logs internos sanitizados;
- testes contra exposição de SQL, payload protegido ou dados internos.

## 6. Produto e experiência

### 6.1 Notificações ainda centradas no Quiz legado

A central atual consulta principalmente rodadas e Medalhas e ainda direciona para rotas históricas. Ela não representa adequadamente:

- Conquistas da plataforma;
- missões prontas para resgate;
- Diário e cofre;
- Eventos;
- compras e equipamentos.

A evolução recomendada é substituir progressivamente a fonte antiga por uma central única da plataforma, sem criar dois sistemas paralelos.

### 6.2 Analytics administrativo permanece legado

As análises administrativas ainda priorizam rodadas, tentativas e perguntas do Quiz. Faltam indicadores de:

- sessões e conclusão por jogo;
- abandono;
- Livre, Diário e Evento;
- participação em Eventos;
- utilização e esgotamento do catálogo;
- dificuldade real;
- retenção;
- economia;
- falhas do Gerador.

Um primeiro painel pode ser somente leitura e consumir projeções já existentes.

### 6.3 Diferenciação dos jogos

Pontos editoriais e de produto que continuam válidos:

- Quem Sou Eu e Três Pistas têm mecânicas muito próximas;
- Memória se beneficiará de imagens em vez de somente texto;
- Associação ainda precisa de títulos, rótulos e referências mais naturais;
- instruções e feedbacks devem manter destaque consistente;
- dificuldades precisam de calibração baseada em uso real;
- deve existir uma janela mínima de repetição por jogo e modo.

Uma matriz de identidade por jogo poderia definir habilidade principal, ritmo, interação, formato editorial, feedback e critério de dificuldade.

### 6.4 Governança editorial incompleta

O CMS opera principalmente com `DRAFT` e `PUBLISHED`. Para expansão do acervo, permanecem relevantes:

- `IN_REVIEW`;
- revisor responsável;
- comentários;
- aprovação;
- arquivamento;
- comparação e rollback de versões;
- importação CSV/JSON;
- Asset Registry para imagens e banners.

## 7. Testes, acessibilidade e PWA

### 7.1 Matriz E2E ainda pode crescer

A cobertura lógica é ampla, mas a validação em navegador pode avançar para:

- sete jogos em Livre;
- sete jogos em Diário;
- mais de um jogo em Evento;
- CMS → publicação → geração → partida;
- abandono, recarga e segunda tentativa;
- proteção de respostas;
- interrupção e retomada no celular.

Não é necessário testar todas as combinações possíveis; contratos compartilhados podem reduzir duplicação.

### 7.2 Acessibilidade e desempenho em dispositivo real

Permanecem recomendados:

- leitor de tela durante feedbacks dos jogos;
- anúncios dinâmicos de acerto, erro e progresso;
- navegação por teclado;
- redução de movimento;
- alto contraste;
- Lighthouse/Core Web Vitals em Android de entrada;
- orçamento de fontes, imagens e JavaScript.

### 7.3 Preparação para Google Play

Antes da abertura como aplicativo:

- estratégia TWA ou empacotamento equivalente;
- assinatura e Asset Links;
- atualização do PWA;
- versionamento visível;
- deep links;
- comportamento em segundo plano;
- observabilidade de crashes;
- formulário de segurança de dados;
- screenshots, política e aprovação legal.

## 8. Segurança e autorização

### 8.1 Permissões transitórias

Eventos e outras áreas ainda reutilizam permissões históricas, e `leader` possui uma lista de compatibilidade explícita.

Antes de delegar administração para uma equipe maior, seria útil definir permissões próprias para:

- CMS;
- Eventos;
- catálogo;
- operações;
- economia;
- Analytics.

Isso deve ser feito sem retirar permissões atuais inadvertidamente.

### 8.2 Segundo fator e recuperação de conta

Continuam no backlog:

- TOTP opcional para administradores;
- recuperação segura de conta por e-mail;
- processo de recuperação do próprio segundo fator;
- revisão de sessões e dispositivos conectados.

## 9. Achados específicos do histórico Git

### 9.1 Versionamento inconsistente

As tags alcançáveis são:

- `v1.0.0`, criada em 16/07 para o piloto controlado do Quiz;
- `v0.2.0`, criada em 25/07 para a primeira base estável da plataforma.

Embora haja uma explicação conceitual, a sequência representa regressão semântica. Uma nova release não deve ser criada sem decidir a linha oficial de versionamento.

Possibilidades para avaliação:

- seguir a partir de `v1.1.0`;
- separar `quiz-v1.0.0` de uma linha própria da plataforma;
- adotar outra convenção documentada.

### 9.2 Lockfiles e arquivos acidentais

O projeto usa pnpm, mas rastreia:

- `pnpm-lock.yaml`;
- `package-lock.json`;
- `tore package-lock.json`;
- `npm-audit.json`.

O último par aparenta ter entrado acidentalmente num commit de fechamento administrativo. Isso deve ser confirmado e limpo numa tarefa própria.

Também seria útil declarar `packageManager` no `package.json`.

### 9.3 Artefatos históricos grandes

Continuam rastreados textos bíblicos completos, JSONs intermediários, CSV e scripts usados na preparação do Quiz original.

Antes de qualquer remoção, deve-se avaliar:

- licença de redistribuição;
- necessidade de auditoria histórica;
- capacidade de reproduzir a importação;
- eventual movimentação para arquivo documental;
- risco de manter múltiplas fontes aparentes de conteúdo.

Não se recomenda reescrever o histórico Git sem necessidade jurídica ou exposição de segredo.

### 9.4 Documentação operacional congelada

`docs/AI/CURRENT_STATE.md` continua no estado de 24/07 e descreve como hipótese um problema do Worker já corrigido posteriormente.

`docs/AI/KNOWN_ISSUES.md` mantém aberta uma falha de dependências já tratada.

O roadmap ainda apresenta jogos implementados como futuros e o backlog permanece orientado ao piloto inicial.

Isso reduz a confiabilidade do Git como memória operacional.

### 9.5 Mensagens de commit inconsistentes

O histórico combina mensagens descritivas com mensagens genéricas, como `Correções`, `Att Nova`, `Add files via upload` e nomes de arquivo isolados.

O impacto não é funcional, mas dificulta:

- localizar regressões;
- produzir changelog;
- auditar decisões;
- realizar rollback seletivo.

### 9.6 Processo de migrations historicamente reativo

O histórico mostra várias correções do reconciliador depois da introdução de migrations, principalmente entre 0031 e 0035.

O mecanismo atual ficou mais seguro, mas o processo precisa exigir antecipadamente:

- objetos criados e alterados;
- validação sobre schema anterior;
- snapshot;
- backup;
- promoção;
- `verify-final`;
- comparação pós-migration.

### 9.7 Branch remota absorvida

`origin/audit/game-content-inventory` não possui mudanças exclusivas em relação à `main`; está apenas atrasada. Pode ser removida após confirmação humana.

### 9.8 Identidade interna ainda ligada ao Quiz

Permanecem nomes como:

- pacote `quiz-biblico-pwa`;
- banco `quiz-biblico-db`;
- Worker `journey-awards`;
- senha temporária com prefixo `Jornada-`;
- rotas e permissões de rodadas.

Não é recomendável renomear banco ou Worker apenas por estética. Porém, textos apresentados ao usuário devem ser atualizados e os nomes internos históricos devem ser documentados.

### 9.9 Superfície de IA desativada

O recurso de sugestões por IA foi desenvolvido, corrigido e depois desativado. Permanecem páginas, endpoints, tabelas e documentação.

É necessária uma decisão explícita entre:

- manter dormente com custo de manutenção conhecido;
- reativar com orçamento e controles;
- arquivar a superfície executável, preservando os dados necessários.

## 10. Dívidas arquiteturais documentadas anteriormente

O próprio repositório já registra:

- Reward e Progress parcialmente concentrados no mesmo módulo;
- `GAME_FINISHED v1` ainda aceito por compatibilidade;
- Notification Service ainda não implementado;
- `legacyLeader` como compatibilidade;
- Medalhas distintas de Conquistas;
- adaptador/importador legado do Quiz ainda preservado;
- Worker de premiações ainda necessário enquanto existirem resultados históricos;
- necessidade futura de separar papéis e permissões.

Esses itens não precisam ser corrigidos todos de uma vez. Precisam apenas de responsável, condição de retirada e evidência de conclusão.

## 11. Questões recomendadas para avaliação pelo ChatGPT

1. Os cinco achados operacionais principais devem anteceder a remoção do legado?
2. A estratégia de versionamento deve continuar em `v1.1.0` ou separar Quiz e Plataforma?
3. Qual deve ser a diferença oficial entre exportação administrativa, backup organizacional e backup integral?
4. Quais dados devem ser anonimizados, excluídos ou preservados para auditoria e idempotência?
5. O encerramento de Eventos deve ser incorporado ao Worker atual ou receber um executor operacional próprio?
6. Ranking e Medalhas continuarão como um módulo competitivo opcional ou serão aposentados?
7. Quando o fallback e o adapter de leitura do Quiz poderão ser removidos com segurança?
8. Os textos bíblicos completos podem permanecer publicamente versionados segundo suas licenças?
9. O recurso de IA deve ser reativado, mantido dormente ou removido?
10. Qual conjunto mínimo de Analytics é necessário antes de ampliar o piloto?
11. A governança editorial completa deve entrar na Fase 5 ou aguardar crescimento do acervo?
12. Quais critérios objetivos determinam que a plataforma está pronta para Google Play?

## 12. Avaliação final

A fundação técnica permite iniciar a Fase 5. A recomendação desta auditoria é não começar pela exclusão imediata de tabelas, APIs ou rotas legadas.

Primeiro devem ser protegidos:

- backup e restauração;
- diagnóstico atualizado;
- privacidade e retenção;
- encerramento operacional dos Eventos;
- limpeza segura dos dados de teste;
- governança documental e de versões.

Depois disso, a remoção do legado poderá ocorrer em etapas reversíveis, usando o inventário já existente em `PHASE_5_LEGACY_AUDIT_BACKLOG.md`.

## 13. Confirmações

- Nenhum arquivo de aplicação foi alterado por esta auditoria.
- Nenhuma migration foi criada ou aplicada.
- Nenhum banco local ou remoto foi modificado.
- Nenhum deploy, push, tag ou commit foi realizado.
- Este relatório não aprova automaticamente nenhuma mudança; ele existe para apoiar avaliação e priorização humana.
