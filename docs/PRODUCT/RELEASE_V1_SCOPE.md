# Escopo Oficial da Release v1.0

Este documento é a referência oficial da Release v1.0 da plataforma **Conte os Feitos**.

Recursos fora deste escopo não devem ser adicionados à versão 1.0 sem decisão explícita, registrada no histórico de decisões do produto.

## 1. Objetivo da Release

Disponibilizar a primeira versão estável da plataforma modular **Conte os Feitos — Jogos e Desafios Bíblicos**, preservando o Quiz Bíblico como primeiro jogo publicado e oferecendo uma base segura, responsiva e preparada para receber novos jogos.

A Release v1.0 deve:

- apresentar uma identidade visual única para a plataforma;
- permitir acesso autenticado e seguro aos recursos disponíveis;
- manter integralmente as regras competitivas já validadas do Quiz Bíblico;
- apresentar somente jogos publicados ou em desenvolvimento, conforme o catálogo oficial;
- funcionar como PWA em navegadores desktop e dispositivos móveis compatíveis;
- manter produção, dados, automações e deploy protegidos pelos processos operacionais aprovados.

## 2. Funcionalidades obrigatórias

### Plataforma

- Home modular e responsiva do Conte os Feitos.
- Navegação principal entre Home, Jogos, Recompensas e Perfil.
- Tela Jogos alimentada por catálogo centralizado.
- Identidade visual oficial v001 aplicada às novas telas.
- Estados claros para jogos disponíveis e em desenvolvimento.
- Páginas informativas individuais para jogos em desenvolvimento.
- Login, logout, recuperação de conta e persistência segura de sessão.
- Perfil do participante e acesso administrativo condicionado à permissão.
- PWA instalável, com fallback offline informativo e sem cache de dados privados.
- Compatibilidade mobile-first e ausência de overflow horizontal nas larguras suportadas.
- Fundação persistente do Core Platform para progresso global (XP, nível e moedas), Conquistas, Missões diárias e Estatísticas.
- Event Engine interno, idempotente e sem endpoint público de publicação.
- Interfaces de leitura autenticadas para Home e Perfil, com estados vazios seguros enquanto nenhum jogo estiver integrado.
- Nenhuma concessão de progresso ou recompensa pelo cliente; mutações futuras ocorrerão somente por consumidores oficiais.

### Quiz Bíblico

- Quiz Bíblico disponível como primeiro módulo publicado.
- Jornadas oficiais e Jornada de Treino.
- Perguntas e alternativas embaralhadas conforme as regras atuais.
- Tempo, respostas e pontuação validados pelo servidor.
- Limite e retomada segura de tentativas.
- Ranking, temporadas e medalhas competitivas das Jornadas.
- Processamento automático e idempotente das premiações após o encerramento.
- Banco de perguntas, revisão, importação e gestão administrativa existentes.

### Operação e segurança

- D1 com histórico de migrations reconciliado.
- Deploy de produção condicionado à validação automatizada.
- Worker de premiações associado ao mesmo D1 e monitorado operacionalmente.
- Testes unitários, contratuais, de integração e de navegador aprovados.
- Diagnóstico administrativo sem inconsistências estruturais conhecidas.
- Termos de Uso, Política de Privacidade e aprovação legal aplicáveis ao escopo de publicação.
- Rotinas documentadas de backup, restauração e limpeza controlada dos dados de piloto.

## 3. Funcionalidades adiadas

Os itens abaixo não fazem parte da Release v1.0:

- integração do Quiz ou de outro jogo com a progressão global do Core;
- gemas e economia virtual além do ledger interno de moedas;
- avanço e recompensa de Missões por eventos reais de jogo;
- funcionamento real do baú diário;
- catálogo amplo de recompensas, itens e economia virtual;
- botão funcional de aviso de lançamento de novos jogos;
- Wordle Bíblico jogável;
- Jogo das 3 Pistas jogável;
- Linha do Tempo;
- Associação de Temas;
- critérios de Conquistas acionados por jogos reais, pop-ups e recompensas associadas;
- colecionáveis e desbloqueáveis de temporadas da plataforma;
- campanhas, eventos e desafios gerais entre diferentes jogos;
- recursos sociais amplos;
- modo projetor;
- múltiplos grupos por organização;
- publicação em loja além do escopo PWA aprovado.

Elementos visuais que representem funcionalidades adiadas devem ser identificados claramente como prévia, “Em desenvolvimento” ou “Em breve” e não podem simular persistência ou conclusão real.

## 4. Critérios de publicação

A Release v1.0 somente pode ser publicada quando todos os critérios abaixo forem atendidos:

- escopo deste documento revisado e aprovado;
- catálogo oficial de jogos atualizado antes da interface;
- nenhuma funcionalidade planejada exposta indevidamente ao usuário;
- lint, build e suítes automatizadas obrigatórias aprovados;
- testes de navegador e responsividade aprovados;
- nenhuma migration pendente no ambiente de destino;
- diagnóstico administrativo estruturalmente saudável;
- Pages, D1 e Worker configurados conforme a documentação operacional;
- nenhum bloqueador conhecido de segurança, integridade ou concorrência;
- backup válido disponível antes de mudanças de produção relevantes;
- checklist legal aprovado para o alcance da publicação;
- revisão manual dos fluxos de login, Quiz, ranking, perfil, administração e logout;
- publicação realizada exclusivamente pelo fluxo autorizado;
- main preservada como referência estável até a aprovação formal da nova versão.

Mudanças que ampliem materialmente este escopo exigem decisão explícita antes de implementação e nova avaliação dos critérios de publicação.

## 5. Roadmap pós-lançamento (v1.1+)

Prioridades previstas após a estabilização da v1.0:

1. Integrar o Quiz ao Core Platform por adaptador, outbox e evento canônico aprovados.
2. Ativar o primeiro ciclo de retenção, incluindo progresso de missões e recompensas por eventos reais.
3. Publicar o Wordle Bíblico.
4. Publicar o Jogo das 3 Pistas.
5. Desenvolver Linha do Tempo após sua mudança formal de status no catálogo.
6. Desenvolver Associação de Temas após sua mudança formal de status no catálogo.
7. Introduzir conquistas gerais, colecionáveis e desbloqueáveis.
8. Realizar polimento final para novos canais de distribuição, incluindo Google Play quando aprovado.

O ordenamento pode ser alterado somente por decisão de produto registrada. A inclusão de qualquer jogo deve respeitar primeiro o [Game Catalog](./GAME_CATALOG.md).
