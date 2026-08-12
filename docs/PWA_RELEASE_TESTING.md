# Teste de release PWA

## Runtime

`pnpm run build` gera `out`; `pnpm run build:pages-functions` produz o bundle validado; `pnpm run pwa:release:prepare` copia exatamente esse bundle para `out/_worker.js`. A suíte usa `wrangler pages dev out` com D1 local fictício e Service Worker permitido. Nenhum acesso remoto é necessário.

## Execução local

```text
pnpm run build
pnpm run build:pages-functions
pnpm run pwa:release:prepare
pnpm run test:pwa-release
```

O teste confirma manifest/MIME/ícones/maskable, instalação e controle pelo SW, shell cacheado, exclusão de `/api/*` e navegações autenticadas, fallback público offline, recuperação online e atualização controlada A→B sem loop.

O fallback canônico é `/offline`. `/offline.html` redireciona no runtime avançado e não deve retornar ao precache, pois impediria a conclusão de `cache.addAll`.

## CI

`PWA release gate` é manual e separado do Quality cotidiano. Deve ser executado sobre o SHA candidato antes da promoção final. Ele não substitui Quality/browser-smoke, não acessa produção e não reduz os gates existentes. Torná-lo uma dependência verificável do workflow de promoção exigirá uma decisão posterior sobre proveniência/run ID, semelhante ao artifact Quality.

## Limites

- Offline completo dos jogos não é prometido: somente shell/fallback público.
- Atualização usa fixture local para simular A→B; a atualização CDN real precisa de smoke pós-promoção.
- Web Vitals reais precisam de domínio público e usuários/dispositivo representativo.
- Instalação e comportamento Android físico dependem da checklist manual.
