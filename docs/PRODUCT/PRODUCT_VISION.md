# Visão do produto

## Identidade

**Conte os Feitos** é a marca de uma futura plataforma cristã modular de **Jogos e Desafios Bíblicos**. A proposta é oferecer experiências leves, acessíveis e responsáveis que incentivem o contato recorrente com toda a Bíblia.

O produto não será limitado a um único formato de perguntas. Cada jogo deverá ter identidade e regras próprias, compartilhando apenas os serviços transversais que forem formalmente aprovados.

## Produto atual

O **Quiz Bíblico** é o primeiro módulo da plataforma e já está validado no piloto `v1.0.0`. Ele reúne:

- Jornadas competitivas;
- tentativas oficiais e de treino;
- Ranking;
- Medalhas;
- Temporadas;
- acervo de perguntas;
- administração e processamento automático de premiações.

Durante a evolução modular, esse conjunto deve continuar funcional e não deve ser reescrito apenas para se adaptar aos jogos futuros.

## Vocabulário conceitual

- **Jornada:** competição pertencente exclusivamente ao Quiz Bíblico.
- **Medalha:** premiação competitiva obtida nas Jornadas do Quiz.
- **Conquista:** objetivo geral e transversal da plataforma, independente das Medalhas.
- **Temporada futura da plataforma:** período que poderá afetar desbloqueáveis e colecionáveis, sem alterar retroativamente as regras competitivas do Quiz.

## Princípios de produto

1. **Bíblia ampla:** os jogos devem usar conteúdo de toda a Bíblia, evitando limitar a plataforma a poucos livros ou temas.
2. **Módulos independentes:** cada jogo possui domínio, regras, progresso e testes próprios.
3. **Servidor como fonte da verdade:** pontuação, progressão, moedas, recompensas e desbloqueáveis persistentes são calculados e validados no servidor.
4. **Preservação do piloto:** a `main` e a tag `v1.0.0` são a referência estável do Quiz validado.
5. **Infraestrutura sustentável:** priorizar os recursos já existentes e compatíveis com o plano gratuito antes de adicionar novos serviços.
6. **Evolução incremental:** introduzir primeiro shell e catálogo; persistência genérica somente após decisão formal e testes.
7. **Privacidade e segurança:** novos módulos herdam os limites de autenticação, organização, autorização, auditoria e cache privado já adotados.

## Limites arquiteturais

- Novos módulos não devem reutilizar as tabelas `rounds` e `attempts` sem uma decisão formal registrada.
- Uma semelhança visual ou conceitual com o Quiz não é justificativa suficiente para compartilhar persistência competitiva.
- Moedas, progressão geral, Conquistas e colecionáveis não devem ser adicionados como campos soltos em `users`.
- O navegador pode apresentar estado, mas não pode conceder ou confirmar recompensas persistentes.
- A política atual do Service Worker continua excluindo APIs autenticadas e conteúdo privado do cache.

## Critério de sucesso da fundação

A plataforma será considerada modular quando puder apresentar e acessar novos jogos sem modificar o motor competitivo do Quiz e sem duplicar autenticação, navegação, identidade ou serviços transversais.
