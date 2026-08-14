# Segurança de contas

**Status:** CURRENT — Sprint 27.7.2D.4

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

## Administração, owner e TOTP

- A autorização continua server-side por papel/permissão e `organizationId`; a UI não concede acesso.
- `owner` é a autoridade máxima da própria organização, possui o acesso administrativo de `admin` e existe no máximo uma conta owner ativa por organização.
- Owner não é promovido pela UI. O provisionamento é operacional, explícito e auditável, após confirmar que não existe owner ativo: `UPDATE users SET role='owner', updated_at=<epoch_ms> WHERE id='<user_id>' AND organization_id='<organization_id>';`. A constraint parcial da migration 0039 recusa um segundo owner ativo.
- Owner e admin devem concluir enrollment TOTP antes de acessar superfícies administrativas; leader pode optar pelo MFA.
- TOTP segue RFC 6238: HMAC-SHA-1, 6 dígitos, período de 30 segundos e janela de ±1 período. O último contador aceito impede replay.
- O segredo é cifrado com AES-256-GCM por `MFA_ENCRYPTION_KEY` (32 bytes em base64url); a chave não fica no banco nem no repositório.
- O login com MFA ativo cria desafio de cinco minutos e somente após TOTP ou recovery code válido cria sessão marcada `mfa_verified`.
- São gerados oito recovery codes MFA, armazenados apenas por SHA-256 e consumidos uma única vez.
- Apenas owner com MFA completo pode revogar MFA de admin da mesma organização; a operação revoga sessões e é auditada. Admin não reseta admin/owner e owner não reseta owner.
- A perda de senha, TOTP e recovery codes do próprio owner exige recuperação operacional externa controlada. Não existe bypass nem papel superior.

### Evidência operacional produtiva

- O smoke controlado de 14/08/2026 comprovou enrollment pela UI, confirmação TOTP, sessão `mfa_verified`, acesso administrativo, logout e novo login com challenge MFA.
- Uma tentativa única de reutilizar o TOTP anteriormente aceito foi rejeitada; o metadado anti-replay permaneceu persistido.
- Oito recovery codes foram gerados e permanecem protegidos/não utilizados. O consumo manual não foi forçado para preservar a recuperação da conta controlada.
- Nenhum segredo TOTP, QR, recovery code, conteúdo cifrado, IV ou hash foi registrado na documentação ou nos logs operacionais da tarefa.

## CSP e headers

- Permanecem `nosniff`, `DENY`, `strict-origin-when-cross-origin`, Permissions Policy restritiva e CSP com `frame-ancestors`, `base-uri`, `form-action` e `object-src` bloqueados.
- `unsafe-eval` não é permitido.
- `unsafe-inline` permanece temporariamente em scripts/estilos porque o artefato estático atual depende desse contrato; removê-lo exige nonces/hashes e validação de hidratação. O Asset Registry atual também precisa de decisão de hospedagem antes de ampliar `img-src`.

## Riscos restantes

- A rotação futura de `MFA_ENCRYPTION_KEY` exige procedimento operacional explícito; a chave produtiva atual permanece provisionada e cifrada.
- Não existe canal de entrega remoto de recuperação; os códigos precisam ser guardados pelo usuário.
- A CSP ainda contém `unsafe-inline`.
- A exceção exclusiva `GHSA-mh99-v99m-4gvg` permanece transitiva em tooling de desenvolvimento até correção upstream compatível.
