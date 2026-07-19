# Ambiente local completo

Este fluxo executa o export do Next.js e as Cloudflare Pages Functions na mesma origem, com um D1 exclusivamente local. Ele não usa `--remote`, não acessa o D1 de produção e não publica o projeto.

## Pré-requisitos

- Node.js 22.13 ou superior;
- pnpm 11;
- dependências instaladas com `pnpm install --frozen-lockfile`.

Não é necessário executar `wrangler login`. A preparação remove eventuais variáveis de autenticação da Cloudflare dos subprocessos D1 e sempre informa `--local`. O comando `wrangler pages dev` é um servidor exclusivamente local e não possui a opção `--remote`; o binding passado a ele usa o mesmo UUID fictício da configuração local.

## Iniciar

Na raiz do repositório, execute:

```bash
pnpm run dev:full
```

O comando:

1. gera o frontend estático em `out/`;
2. aplica todas as migrations em `.wrangler/local-state/`;
3. cria, de modo idempotente, a organização e o administrador locais;
4. inicia o frontend e as Pages Functions em uma única URL.

Acesse:

```text
http://localhost:8788
```

Credenciais locais:

```text
Usuário: adminlocal
Senha: TesteLocal2026!
```

Essas credenciais existem apenas no D1 local ignorado pelo Git. O banco começa sem Jornadas; isso permite visualizar a Home autenticada em seu estado seguro sem alterar dados reais.

## Encerrar

No terminal em que o servidor está ativo, pressione `Ctrl+C`. O banco local permanece em `.wrangler/local-state/` para a próxima execução.

Para reiniciar os dados do zero, encerre o servidor e remova manualmente apenas a pasta `.wrangler/local-state/`. Nunca use comandos com `--remote` para desenvolvimento.

## Por que `pnpm run dev` não oferece as APIs

`pnpm run dev` executa `next dev`. Esse servidor conhece as páginas e componentes em `app/`, mas não interpreta a pasta `functions/` das Cloudflare Pages. Por isso `/api/auth/login/` e `/api/auth/me/` retornam `404` nesse modo. O comando `dev:full` usa `wrangler pages dev`, que monta as Pages Functions e o binding local `DB`.

## Solução de problemas

- Use `localhost`, como indicado acima, para que o cookie seguro de sessão seja tratado corretamente pelo navegador no ambiente local.
- Se a porta 8788 estiver ocupada, encerre o outro processo antes de tentar novamente.
- Se uma migration nova for adicionada, basta executar `pnpm run dev:full`; somente migrations pendentes serão aplicadas ao D1 local.
- Não reutilize `workers/journey-awards/wrangler.jsonc`: ele pertence ao Worker agendado e contém a associação de produção.
