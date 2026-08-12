# Matriz de qualidade dos jogos

**Status:** CURRENT — Sprint 27.4  
**Jogos:** Quiz, Wordle, Linha do Tempo, Memória, Associação, Quem Sou Eu e Três Pistas.

## Estratégia

A matriz evita 21 fluxos E2E duplicados. Engines, schemas e identidades específicas são validados por testes unitários/contratuais; Loader, segurança, geração e lifecycle por integração; navegação, abandono, resultado e responsividade por Playwright representativo.

| Contrato | FREE_PLAY | DAILY | EVENT |
|---|---|---|---|
| Sete jogos registrados e carregáveis | contrato do catálogo + suíte dos jogos | conteúdo oficial/gerador por sete tipos | catálogo/event game validation |
| Seleção e isolamento organizacional | `platform-free-play` | `daily-objectives` | `platform-events` |
| Início/conclusão server-side | progress/finish integration | lifecycle DAILY | Event action/start/selection |
| Replay/tentativa | nova chave gera seleção diferente | uma tentativa; sem replay | uma tentativa por jogo; sem replay |
| Abandono/idempotência | abandonment integration + E2E | safe-exit E2E | Event E2E |
| Retorno correto | Jogos | Desafios Diários | Detalhes do Evento |
| Resposta protegida | schemas/adapters/Loader | idem | idem |

## Casos específicos

| Jogo | Contrato específico protegido |
|---|---|
| Quiz | tempo e ordem no servidor; timeout não vira resposta; conteúdo universal |
| Wordle | palavra válida, teclado sincronizado, avaliação server-side |
| Linha do Tempo | ordem por IDs opacos e validação server-side |
| Memória | pares embaralhados e normalização independente do tamanho |
| Associação | pares opacos, ambos os lados únicos e validação no servidor |
| Quem Sou Eu | dicas progressivas e resposta protegida |
| Três Pistas | exatamente três pistas, progressão e resposta protegida |

## Cobertura de experiência

- Playwright normal: login, Home, Daily, catálogo, jogos, Perfil, Ranking, Eventos, administração, MFA e abandono; Service Worker bloqueado por estabilidade.
- PWA Release: artifact production-like, Service Worker permitido, desktop Pixel 5, install resources, cache, offline e update.
- Axe: páginas representativas e shells compartilhados; violações sérias/críticas bloqueiam os testes.
- Android físico e Web Vitals públicos permanecem validações humanas/externas, não são inferidos desta matriz.
