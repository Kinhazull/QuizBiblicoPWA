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

## Testar no celular pela rede Wi-Fi

Mantenha o computador e o celular conectados à mesma rede Wi-Fi. Na raiz do projeto, execute:

```bash
pnpm run dev:lan
```

Esse comando reutiliza o mesmo build, as mesmas migrations locais, o mesmo usuário de teste e o mesmo estado de `dev:full`. A única diferença é que o servidor escuta em `0.0.0.0`, permitindo acesso por outro aparelho da rede privada. O terminal exibirá os IPv4 encontrados, por exemplo:

```text
http://192.168.1.25:8788
```

Abra no celular um dos endereços exibidos. Não use `127.0.0.1` nem `localhost` no celular, pois eles apontariam para o próprio telefone.

O modo LAN não cria túnel público, não exige `wrangler login`, remove credenciais Cloudflare dos subprocessos e continua usando exclusivamente `.wrangler/local-state/` e o UUID fictício do banco local. A sessão HTTP sem `Secure` é habilitada somente pela variável efêmera `LOCAL_LAN_DEVELOPMENT=true` desse comando; produção e `dev:full` continuam emitindo cookies `Secure`.

### Firewall do Windows

Primeiro, confirme em **Configurações → Rede e Internet → Wi-Fi → Propriedades** que o perfil da rede está como **Privado**. Ao iniciar pela primeira vez, se o Windows perguntar, permita o Node.js somente em **Redes privadas** e deixe **Redes públicas** desmarcado.

Se não aparecer a pergunta e o celular não conseguir abrir a página, execute o Windows PowerShell **como Administrador**:

```powershell
New-NetFirewallRule -DisplayName "Conte os Feitos - desenvolvimento LAN 8788" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8788 -Profile Private
```

Essa regra libera somente TCP 8788 em redes classificadas como privadas. Para removê-la depois:

```powershell
Remove-NetFirewallRule -DisplayName "Conte os Feitos - desenvolvimento LAN 8788"
```

Para encerrar o servidor, volte ao terminal e pressione `Ctrl+C`. A regra do Firewall, se criada manualmente, não é removida automaticamente. Redes Wi-Fi com isolamento de clientes podem impedir a comunicação entre computador e celular mesmo com o Firewall configurado.

## Por que `pnpm run dev` não oferece as APIs

`pnpm run dev` executa `next dev`. Esse servidor conhece as páginas e componentes em `app/`, mas não interpreta a pasta `functions/` das Cloudflare Pages. Por isso `/api/auth/login/` e `/api/auth/me/` retornam `404` nesse modo. O comando `dev:full` usa `wrangler pages dev`, que monta as Pages Functions e o binding local `DB`.

## Solução de problemas

- Use `localhost`, como indicado acima, para que o cookie seguro de sessão seja tratado corretamente pelo navegador no ambiente local.
- Se a porta 8788 estiver ocupada, encerre o outro processo antes de tentar novamente.
- No modo LAN, teste outro IPv4 exibido caso o computador tenha adaptadores de VPN ou redes virtuais.
- Se uma migration nova for adicionada, basta executar `pnpm run dev:full`; somente migrations pendentes serão aplicadas ao D1 local.
- Não reutilize `workers/journey-awards/wrangler.jsonc`: ele pertence ao Worker agendado e contém a associação de produção.
