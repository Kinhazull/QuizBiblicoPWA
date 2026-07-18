# Roadmap oficial

O roadmap define a ordem conceitual da evolução. A entrada em um módulo depende da aprovação e validação do anterior; a numeração não autoriza implementação antecipada de banco ou regras.

## Módulo 0 — Diagnóstico e preparação

- Mapear arquitetura, rotas, dependências e riscos.
- Preservar a `main` como `v1.0.0` estável.
- Criar branch própria e registrar baseline.
- Consolidar visão, linguagem, decisões e política de colaboração.

## Módulo 1 — Identidade visual

- Definir a identidade da plataforma sem descaracterizar o Quiz.
- Centralizar tokens, padrões de cartões, ícones e estados.
- Validar acessibilidade, responsividade e desempenho visual.
- Não alterar regras do Quiz.

## Módulo 2 — Estrutura da plataforma

Este módulo incorpora a subdivisão técnica aprovada no diagnóstico:

### 2.1 — Shell da plataforma

- Separar a apresentação autenticada do fluxo de login e cadastro.
- Reutilizar o `AuthProvider` e os controles globais existentes.

### 2.2 — Catálogo de módulos

- Criar registro central, inicialmente estático, de jogos disponíveis e futuros.
- Não criar persistência apenas para exibir o catálogo inicial.

### 2.3 — Home modular

- Transformar a Home em ponto de descoberta da plataforma.
- Evitar duplicação de notificações, perfil e navegação.

### 2.4 — Integração do Quiz Bíblico

- Apresentar o Quiz como o primeiro módulo.
- Preservar `/jogar`, Jornadas, tentativas, Ranking, Medalhas e Worker.
- Manter compatibilidade com links existentes durante a transição.

## Módulo 3 — Núcleo de progressão

- Definir progressão geral, Conquistas, moedas, recompensas e desbloqueáveis.
- Criar serviços de concessão idempotentes e auditáveis no servidor.
- Manter progresso de cada jogo separado do progresso geral.
- Exigir decisão formal e desenho de dados antes de migrations.

## Módulo 4 — Primeiro ciclo de retenção

- Introduzir um ciclo recorrente simples e mensurável.
- Validar se progressão e recompensas incentivam retorno saudável.
- Não conflitar com Jornadas, Ranking ou Medalhas do Quiz.

## Módulo 5 — Wordle Bíblico

- Implementar jogo diário ou periódico de descoberta de palavra bíblica.
- Criar regras, estado e persistência próprios.

## Módulo 6 — Jogo das 3 Pistas

- Criar experiência de identificação progressiva por pistas.
- Manter validação e pontuação no servidor quando persistentes.

## Módulo 7 — Linha do Tempo

- Organizar eventos, personagens e livros em ordem histórica ou narrativa.
- Documentar critérios de curadoria bíblica usados pelo jogo.

## Módulo 8 — Associação de Temas

- Relacionar personagens, passagens, livros, acontecimentos e temas.
- Preservar conteúdo amplo de toda a Bíblia.

## Módulo 9 — Colecionáveis

- Introduzir itens colecionáveis e desbloqueáveis da plataforma.
- Temporadas futuras poderão afetar esses itens, sem alterar as Medalhas competitivas das Jornadas.

## Módulo 10 — Polimento e Google Play

- Consolidar experiência, acessibilidade, desempenho e observabilidade.
- Revisar requisitos de empacotamento e publicação na Google Play.
- Realizar nova aprovação legal, operacional e de segurança para abertura ampliada.

## Regra de avanço

Cada módulo deve possuir branch própria, critérios de aceite, testes e estratégia de rollback. Mudanças de persistência devem ser aditivas e ocorrer em tarefa separada da alteração visual que as utiliza.
