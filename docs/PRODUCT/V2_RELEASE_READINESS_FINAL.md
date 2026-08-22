# Readiness final da v2.0.0

**Auditoria:** Sprint 27.7.0 — 13/08/2026  
**Decisão 27.7.0:** `READY_FOR_27_7_1`  
**Fechamento 27.7.3 (registro histórico):** RC final `DONE`; naquele momento, `27.7.4` era a próxima etapa.
**Situação posterior em 22/08/2026:** a primeira auditoria 27.7.4 foi executada e a estabilização 27.7.5 foi implementada na `main`; o estado corrente e os gates ainda pendentes estão em `docs/AI/CURRENT_STATE.md`, `docs/PRODUCT/ROADMAP.md` e `docs/PRODUCT/RELEASE_SNAPSHOT.md`.
**Escopo inicial:** auditoria local. As evidências operacionais da 27.7.2 abaixo atualizam explicitamente os estados remotos comprovados.

Este é o registro central da sequência 27.7. Documentos históricos continuam úteis, mas afirmações remotas ou anteriores às Waves de arte não substituem esta baseline.

## Baseline real

- branch: `main`;
- HEAD inicial da auditoria: `11fd739b7824854890662d075f2e9c0311590b68` (`feat: complete v2 asset adoption`);
- versão declarada: `2.0.0-rc.1`; a tag `v2.0.0` não existe nesta auditoria;
- 159 commits alcançáveis pelo HEAD inicial;
- 40 migrations sequenciais, terminando em `0039_administrative_mfa.sql`;
- árvore inicialmente limpa. Esta auditoria adiciona este documento; as alterações documentais/contratuais da Wave 7 também aparecem no diff final da sessão;
- evidência final da RC: build 66/66 páginas, `test:all` 285/285, Playwright 100 aprovados/4 ignorados, PWA 10/10, typecheck, lint, Pages Functions e Worker dry-run aprovados;
- a validação humana orientada pela checklist da 27.7.4 permanece intencionalmente fora desta sprint.

## Matriz de readiness

| Domínio | Estado | Motivo quando não `READY` |
|---|---|---|
| A. Arquitetura | READY | — |
| B. Runtime | READY | — |
| C. Banco / D1 | READY | Ledger/schema verificados remotamente com 40 migrations e zero pendências. |
| D. Migrations | READY | 0039 promovida e validada por `verify-final`/compare estrutural. |
| E. Autenticação | READY | — |
| F. MFA | READY | Enrollment pela UI, TOTP, sessão verificada, novo login, replay rejection e geração protegida de recovery codes foram comprovados em produção. |
| G. RBAC / owner | READY_WITH_MANUAL_CHECK | Constraint/fluxo existem; confirmar owner único e matrícula MFA em produção. |
| H. Sessões | READY | — |
| I. Recuperação de conta | READY_WITH_MANUAL_CHECK | Contratos existem; smoke produtivo seguro ainda é operacional. |
| J. Segurança HTTP/CSP | READY | — |
| K. Dependências/advisories | READY_WITH_MANUAL_CHECK | Exceção limitada para `brace-expansion`; `image-size@2.0.2` segue transitivo de tooling até correção upstream. |
| L. Backup/restore | READY | Chave de backup e restore remoto isolado estão documentados como concluídos. |
| M. Cron/Worker | READY_WITH_MANUAL_CHECK | Worker versão 61 e cron `* * * * *` comprovados; saúde recorrente continua desconhecida sem heartbeat. |
| N. Outbox/consumers | READY | — |
| O. Operational Health | READY | Consultado em produção com sessão administrativa MFA legítima; sistema estruturalmente saudável. |
| P. CMS | READY | — |
| Q. Biblioteca Universal | READY | — |
| R. Gerador Universal | READY | — |
| S. Eventos | READY | — |
| T. Reservas | READY | — |
| U. FREE_PLAY | READY | — |
| V. DAILY | READY | — |
| W. Economia | READY | — |
| X. Progressão | READY | — |
| Y. Coleções | READY | — |
| Z. Perfil | READY_WITH_MANUAL_CHECK | Perfil autenticado atual está coberto; destino da superfície pública histórica permanece decisão de produto. |
| AA. Ranking | READY | — |
| AB. Analytics | READY | — |
| AC. Central Administrativa | READY_WITH_MANUAL_CHECK | Contratos estão cobertos; smoke por papel/permissão deve integrar a RC final. |
| AD. Os 7 jogos | READY | — |
| AE. PWA | READY_WITH_MANUAL_CHECK | Gate production-like existe; instalação Android física ainda pendente. |
| AF. Offline/update | READY_WITH_MANUAL_CHECK | Automatizado localmente; validar ciclo real no dispositivo/domínio candidato. |
| AG. Responsividade | READY_WITH_MANUAL_CHECK | Contratos/Playwright anteriores existem; checklist final em aparelhos permanece obrigatório. |
| AH. Acessibilidade | READY_WITH_MANUAL_CHECK | Contratos automatizados existem; navegação/leitor de tela manual final permanece necessária. |
| AI. Brand v2 | READY | — |
| AJ. Game Art | READY | — |
| AK. Reward Art | READY | — |
| AL. Collectible Art | READY | 16 IDs funcionais resolvidos; aliases `frame-covenant`/`frame-royal` estão formalizados. |
| AM. Sistema/Eventos/Progressão Art | READY | — |
| AN. Conteúdo | READY_WITH_MANUAL_CHECK | 984 perguntas e 380 itens oficiais foram reconfirmados remotamente; revisão bíblica humana amostral segue aberta para release pública. |
| AO. Licenças/proveniência | BLOCKED_EXTERNAL | Proveniência interna está registrada; purge histórico e revisão de citações/licenças exigem decisão jurídica humana. |
| AP. Jurídico/LGPD | BLOCKED_EXTERNAL | Documentos são tecnicamente coerentes, mas Termos/Privacidade, bases/prazos e transferências precisam de aprovação jurídica humana. |
| AQ. Google Play/TWA | BLOCKED_EXTERNAL | Domínio, package ID, assinatura, DAL, AAB, Play Console e Android físico ainda não existem/foram validados. Não bloqueia a RC web. |
| AR. CI | READY | Quality `31760852798` e browser-smoke aprovados no SHA `7921a05`. |
| AS. Release Truth | READY | Quality `31760852798`, artifact `9204548500`, promoção `31764192229`, deployment Pages `8be3bbd5` e smoke estão encadeados e comprovados; `1e78facd` foi somente registro Git skipped. |
| AT. Rollback | READY | Backup pré-0039, reconciliador, compare, checksum e runbooks possuem evidência; restore isolado histórico foi aprovado. |
| AU. Zero-cost readiness | READY_WITH_MANUAL_CHECK | Política existe; cotas continuam revisão manual e não há telemetria paga. |
| AV. Observabilidade | READY_WITH_MANUAL_CHECK | Health/logs existem; heartbeat, monitor externo e alertas proativos são melhorias futuras. |
| AW. Documentação | READY | Contradições factuais correntes reconciliadas; documentos históricos permanecem históricos. |
| AX. Store assets | BLOCKED_EXTERNAL | Pack auditado, mas ícone/feature graphic exigem edição e screenshots exigem recaptura da RC. |
| AY. Dados/fixtures/placeholders | READY_WITH_MANUAL_CHECK | Recovery sintético está ignorado e fora do artifact; validar build final e capturas sem dados pessoais/templates. |
| AZ. Legado remanescente | READY_WITH_MANUAL_CHECK | Rotas históricas são redirects/compatibilidade; APIs administrativas antigas ainda existem, mas não há fluxo participante legado ativo. |

## Blockers e riscos

### Blockers internos

Nenhum blocker interno conhecido após a 27.7.1. Revisão editorial e jurídica são aprovações humanas; MFA/0039 e contagens produtivas são verificações operacionais da 27.7.2.

### Fechamento operacional — Sprint 27.7.2

1. Worker, backup, migration 0039, ledger, conteúdo e gates do SHA candidato estão comprovados.
2. Release Truth do Pages concluída: `1e78facd` era registro Git bloqueado, auto-deploy segue desabilitado e o artifact validado foi promovido oficialmente em `8be3bbd5`.
3. Smoke MFA administrativo controlado concluído sem ampliar permissões ou expor secrets; owner extremo continua fora do teste por decisão de segurança.
4. Completar os smokes humanos finais de RC (jogos/modos, Android físico e jurídico/editorial) antes do Go público.

Conclusão: não resta blocker técnico de preparação produtiva. A baseline está `TECHNICALLY_READY_FOR_RC` privada/controlada.

### Blockers humanos

- aprovação jurídica de Termos/Privacidade, bases legais, prazos, adolescentes/acesso infantil incidental e processamento internacional;
- decisão jurídica sobre blobs históricos de traduções bíblicas e revisão de citações públicas;
- revisão bíblica/editorial amostral final;
- aprovação visual e capturas finais da Store;
- decisão sobre domínio/package ID/assinatura quando iniciar Google Play.

### Blockers externos

- Android físico, domínio HTTPS canônico e medições públicas de Web Vitals;
- Google Play Console, target SDK vigente, Data Safety, Target Audience, classificação, DAL e AAB;
- correção upstream do `image-size` transitivo.

### Riscos aceitáveis

- ausência de heartbeat persistido, monitor externo e alerta proativo: sinais indiretos/Health/runbooks existem; manter revisão manual de custo zero;
- Store masters em `public/store`: acrescentam 16,23 MiB ao artifact público, mas não ao precache; mover depois de confirmar URLs externas;
- masters pesados permanecem públicos como fontes, porém consumidores runtime usam derivados leves;
- exceção transitiva de audit somente para tooling controlado, desde que o gate permaneça restrito aos GHSAs documentados;
- rotas históricas como redirects e identificadores operacionais legados podem permanecer sem exposição como produto Quiz.

### POST_RELEASE

- onboarding e quatro artes da Wave 6;
- heartbeat persistido, monitor externo, alertas proativos e coleta automática de cotas;
- vocabulário Wordle 2.0 e imagens de Memória;
- eventual limpeza de masters Store e APIs históricas após telemetria/evidência;
- perfil público, se aprovado como funcionalidade futura;
- expansão nativa/Google Play além da RC web.

## Revalidações específicas

- `MFA_ENCRYPTION_KEY`: presença cifrada comprovada sem leitura do valor; enrollment funcional, TOTP, novo login e replay rejection aprovados em produção.
- migration 0039: promovida e verificada remotamente; ledger 40, zero pendências.
- `D1_BACKUP_ENCRYPTION_KEY`: documentada como provisionada/custodiada no Environment `production`; não foi consultada.
- restore remoto: documentado como aprovado em D1 isolado e descartável em 12/08/2026.
- Cron/alertas: riscos operacionais futuros, não blockers internos da RC.
- conteúdos: pacote versionado contém 380 IDs únicos e a produção confirmou 380 oficiais publicados; o Quiz possui 984 itens publicados reconfirmados remotamente.
- textos bíblicos completos: fontes removidas permanecem ausentes da árvore ativa; scripts históricos não têm consumidor runtime de release.
- Asset Pack: Waves 1–5 integradas, Wave 6 `POST_RELEASE`, Wave 7 auditada. Não há divergência conhecida entre hashes do manifesto e arquivos.
- Store: nenhum dos nove assets está pronto para upload sem etapa humana.

## Jurídico e privacidade

### Implementado

- superfícies públicas usam `suporteconteosfeitos@gmail.com`;
- controlador descrito sem CPF/CNPJ/endereço inventado;
- direitos de acesso/exportação e solicitação de exclusão/anonimização possuem contratos atuais;
- nenhum apagamento automático por inatividade é alegado ou executado;
- textos bíblicos integrais sem licença comprovada estão fora da árvore ativa.

### Decisões de produto resolvidas

- público formal: adolescentes e adultos;
- crianças não são público-alvo formal;
- não existem age gate, consentimento parental ou contas infantis fictícias;
- retenção técnica permanece preliminar e sem exclusão destrutiva automática.

### Revisão humana/jurídica obrigatória

- identidade/endereço do controlador se exigidos legalmente;
- bases e prazos finais de retenção;
- acesso infantil incidental e adolescentes;
- subprocessadores/transferências internacionais reais;
- aprovação final de Termos, Privacidade e Data Safety;
- purge ou retenção jurídica dos blobs históricos.

## Separação Web × Google Play

### Antes da RC web

- fechar blockers internos da 27.7.1;
- realizar preparação operacional da 27.7.2;
- repetir gates completos no SHA candidato;
- validar Android/browser móvel físico e Web Vitals no domínio candidato;
- obter aprovação jurídica mínima para abertura pública.

### Antes da Google Play

- tudo da RC web;
- domínio/package ID, assinatura/custódia, DAL, Bubblewrap/TWA, AAB e target SDK;
- Android físico completo;
- Data Safety, Target Audience, classificação e Store Listing aprovados;
- editar ícone/feature graphic e recapturar cinco screenshots da RC.

## Inconsistências documentais encontradas

- `docs/AI/KNOWN_ISSUES.md` ainda chama Brand v2 e colecionáveis de não adotados, contrariando runtime, manifesto e testes atuais;
- `docs/AI/CURRENT_STATE.md` ainda afirma que 27.7 não começou;
- `docs/PRODUCT/RELEASE_SNAPSHOT.md` diz que Analytics não foi iniciado e mantém arte final como blocker, embora essas entregas já existam;
- `docs/PRODUCT/COLLECTIBLES_ART_DIRECTION.md` e trechos do snapshot ainda descrevem placeholders anteriores à Wave 4;
- documentos operacionais agora registram evidência produtiva de backup/restore, 0039 e smoke MFA controlado;
- documentos históricos sobre fallback do Quiz são preservados como história e não representam o runtime atual.

Essas inconsistências são registradas, não corrigidas nesta auditoria.

## Critério de saída

`READY_FOR_27_7_3`: a preparação produtiva está concluída e não há blocker técnico para iniciar a RC final privada/controlada. A aplicação ainda não está autorizada para release pública nem está Google Play Ready.
