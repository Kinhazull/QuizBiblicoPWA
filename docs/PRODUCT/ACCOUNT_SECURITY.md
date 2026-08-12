# Segurança de contas

**Status:** CURRENT — Sprint 27.1

## Credenciais

- Novas senhas usam `PBKDF2-HMAC-SHA-256`, salt aleatório de 128 bits e 100.000 iterações.
- O formato atual persistido é `pbkdf2-sha256$100000$<derivação-base64url>`; o salt permanece em coluna separada.
- Hashes históricos sem metadados de 100.000 ou 25.000 iterações continuam aceitos somente para autenticação compatível.
- Uma autenticação válida com formato/parâmetro antigo dispara rehash oportunista. A atualização usa compare-and-swap sobre hash e salt anteriores, portanto logins concorrentes não sobrescrevem uma credencial já atualizada.
- Senha inválida nunca dispara rehash. Falha operacional no rehash não transforma uma credencial inválida em válida nem bloqueia uma autenticação já validada.

## Recuperação

- O canal existente é código de recuperação previamente gerado pelo próprio usuário; não existe entrega por e-mail e a interface não deve sugerir que exista.
- São gerados seis códigos aleatórios, exibidos uma única vez e armazenados somente por SHA-256.
- Gerar um conjunto novo remove o conjunto anterior e exige senha atual.
- O código expira em 90 dias, é single-use e a recuperação válida invalida todos os códigos ainda ativos, todas as sessões e o estado de bloqueio de login.
- Código inválido, expirado, usado, conta inexistente ou inativa retorna o mesmo erro público `invalid_recovery`.

## Sessões e CSRF

- Tokens de sessão possuem 256 bits aleatórios e somente o SHA-256 é persistido.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` fora do modo LAN local explicitamente isolado.
- Sessão comum: 12 horas. Sessão persistente: 30 dias.
- Login cria token novo; logout remove a sessão corrente; troca, reset administrativo e recuperação de senha removem todas as sessões do usuário.
- Mutações `/api/*` exigem mesma origem por `Origin` ou `Sec-Fetch-Site`; respostas API usam `no-store, private`.

## Limites de abuso

- Login: 10 requisições por 15 minutos por IP+usuário, com bloqueio da credencial após 5 falhas na janela.
- Cadastro: 8 por hora por IP.
- Recuperação: 6 por 30 minutos por IP.
- Geração de códigos: 3 por hora por usuário+IP.
- Reset administrativo: 10 por hora por administrador+IP.

## Administração e TOTP

- A autorização continua server-side por papel/permissão e `organizationId`; a UI não concede acesso.
- TOTP administrativo foi adiado. O baseline não possui segredo MFA, segundo estágio de login, recovery codes MFA ou ciclo de enrolamento. Uma implementação honesta exigirá migration aditiva e contrato próprio, e não deve ser simulada nesta sprint.

## CSP e headers

- Permanecem `nosniff`, `DENY`, `strict-origin-when-cross-origin`, Permissions Policy restritiva e CSP com `frame-ancestors`, `base-uri`, `form-action` e `object-src` bloqueados.
- `unsafe-eval` não é permitido.
- `unsafe-inline` permanece temporariamente em scripts/estilos porque o artefato estático atual depende desse contrato; removê-lo exige nonces/hashes e validação de hidratação. O Asset Registry atual também precisa de decisão de hospedagem antes de ampliar `img-src`.

## Riscos restantes

- TOTP administrativo ainda não existe.
- Não existe canal de entrega remoto de recuperação; os códigos precisam ser guardados pelo usuário.
- A CSP ainda contém `unsafe-inline`.
- A exceção exclusiva `GHSA-mh99-v99m-4gvg` permanece transitiva em tooling de desenvolvimento até correção upstream compatível.
