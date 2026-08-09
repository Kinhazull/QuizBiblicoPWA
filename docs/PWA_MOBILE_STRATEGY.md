# Estratégia PWA e Mobile

## Contrato atual

- Manifest: marca Conte os Feitos, escopo `/`, `standalone`, portrait, português e categorias educação/jogos.
- Ícones: PNG 192, PNG 512, Apple Touch e SVG. O 512 atual possui fundo e margem compatíveis com uso maskable; validar recorte em Android real.
- Service worker: cacheia apenas shell público e assets estáticos; `/api/*` e HTML autenticado nunca entram no cache.
- Atualização: uma versão instalada detecta o worker novo, informa o usuário, envia `SKIP_WAITING`, aguarda `controllerchange` e recarrega de forma controlada.
- Logout: invalida sessão no servidor e limpa estado cliente não persistente.

## ONLINE_REQUIRED

Autenticação, geração/início de partidas, ações, conclusão, recompensas, progressão, economia, CMS e administração exigem backend. O offline fornece somente uma página pública explicativa. Nunca cria partida, resultado ou recompensa local.

## Retomada

O servidor mantém a autoridade sobre seleção, participação, lifecycle, tentativa e idempotência. Troca de aba, refresh ou reconexão não pode conceder nova tentativa Daily/Event nem duplicar recompensa. Encerrar totalmente o processo pode exigir reabrir a rota de origem quando não houver contexto cliente; isso é uma limitação conhecida, não autorização para reiniciar.

## Baseline mobile/performance

- Viewports de contrato: 320, 360, 390, 412 e Pixel 5; portrait prioritário.
- Gate: sem overflow impeditivo, controles nomeados, foco visível, alvos utilizáveis e nenhuma violação axe serious/critical reproduzível.
- Build estático e assets locais evitam dependências externas no caminho crítico. Web Vitals reais devem ser medidos após deploy controlado com CDN/Workers, CPU reduzida e rede lenta; números de `next dev` não são baseline de produção.
- Baseline local de sanidade em `next dev`, CPU 4× e rede simulada: interação inicial pública observada entre aproximadamente 5,8 s e 10,6 s. O gate de 15 s detecta somente regressão catastrófica e não substitui LCP/INP/CLS públicos.

## Atualização e cache

Cada release funcional deve alterar a chave `CACHE` de `public/sw.js`. Assets incompatíveis são removidos no `activate`. O cache não pode conter respostas privadas, APIs ou páginas autenticadas.
