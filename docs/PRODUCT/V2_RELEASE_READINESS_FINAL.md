# Readiness final da v2.0.0

**Auditoria:** Sprint 27.7.0 — 13/08/2026  
**Decisão 27.7.0:** `READY_FOR_27_7_1`  
**Fechamento 27.7.1:** blockers internos documentais encerrados; `27.7.2 NEXT`.  
**Escopo:** evidência local do repositório. Nenhum estado remoto foi consultado ou inferido.

Este é o registro central da sequência 27.7. Documentos históricos continuam úteis, mas afirmações remotas ou anteriores às Waves de arte não substituem esta baseline.

## Baseline real

- branch: `main`;
- HEAD inicial da auditoria: `11fd739b7824854890662d075f2e9c0311590b68` (`feat: complete v2 asset adoption`);
- versão declarada: `2.0.0-rc.1`; a tag `v2.0.0` não existe nesta auditoria;
- 159 commits alcançáveis pelo HEAD inicial;
- 40 migrations sequenciais, terminando em `0039_administrative_mfa.sql`;
- árvore inicialmente limpa. Esta auditoria adiciona este documento; as alterações documentais/contratuais da Wave 7 também aparecem no diff final da sessão;
- última evidência registrada de build: 63 páginas; não reexecutado nesta auditoria;
- evidência focada e `test:quick` foram reexecutados ao final. Suítes pesadas permanecem evidência dos gates anteriores e devem ser repetidas na RC final.

## Matriz de readiness

| Domínio | Estado | Motivo quando não `READY` |
|---|---|---|
| A. Arquitetura | READY | — |
| B. Runtime | READY | — |
| C. Banco / D1 | READY_WITH_MANUAL_CHECK | Estado remoto não foi consultado; confirmar schema/ledger antes da promoção. |
| D. Migrations | READY_WITH_MANUAL_CHECK | Contratos locais chegam à 0039; promoção remota da 0039 não está comprovada localmente. |
| E. Autenticação | READY | — |
| F. MFA | READY_WITH_MANUAL_CHECK | Implementação `LOCAL_VERIFIED`; secret e migration produtivos são `REMOTE_UNKNOWN / TO_VERIFY_IN_27_7_2`. |
| G. RBAC / owner | READY_WITH_MANUAL_CHECK | Constraint/fluxo existem; confirmar owner único e matrícula MFA em produção. |
| H. Sessões | READY | — |
| I. Recuperação de conta | READY_WITH_MANUAL_CHECK | Contratos existem; smoke produtivo seguro ainda é operacional. |
| J. Segurança HTTP/CSP | READY | — |
| K. Dependências/advisories | READY_WITH_MANUAL_CHECK | Exceção limitada para `brace-expansion`; `image-size@2.0.2` segue transitivo de tooling até correção upstream. |
| L. Backup/restore | READY | Chave de backup e restore remoto isolado estão documentados como concluídos. |
| M. Cron/Worker | READY_WITH_MANUAL_CHECK | Sem heartbeat persistido; logs e sinais indiretos exigem conferência operacional. |
| N. Outbox/consumers | READY | — |
| O. Operational Health | READY_WITH_MANUAL_CHECK | Endpoint existe; conferir produção após promoção. |
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
| AN. Conteúdo | READY_WITH_MANUAL_CHECK | 380 itens passam contratos; 984 perguntas são evidência declarada/remota anterior, não recontadas nesta auditoria. Revisão bíblica humana amostral segue aberta. |
| AO. Licenças/proveniência | BLOCKED_EXTERNAL | Proveniência interna está registrada; purge histórico e revisão de citações/licenças exigem decisão jurídica humana. |
| AP. Jurídico/LGPD | BLOCKED_EXTERNAL | Documentos são tecnicamente coerentes, mas Termos/Privacidade, bases/prazos e transferências precisam de aprovação jurídica humana. |
| AQ. Google Play/TWA | BLOCKED_EXTERNAL | Domínio, package ID, assinatura, DAL, AAB, Play Console e Android físico ainda não existem/foram validados. Não bloqueia a RC web. |
| AR. CI | READY_WITH_MANUAL_CHECK | Workflows e gates existem; executar Quality/PWA gates sobre o SHA candidato. |
| AS. Release Truth | READY | Fontes correntes reconciliadas na 27.7.1; estados remotos permanecem explicitamente desconhecidos até 27.7.2. |
| AT. Rollback | READY_WITH_MANUAL_CHECK | Backup/reconciliador/runbooks existem; confirmar artifact/backup do SHA candidato. |
| AU. Zero-cost readiness | READY_WITH_MANUAL_CHECK | Política existe; cotas continuam revisão manual e não há telemetria paga. |
| AV. Observabilidade | READY_WITH_MANUAL_CHECK | Health/logs existem; heartbeat, monitor externo e alertas proativos são melhorias futuras. |
| AW. Documentação | READY | Contradições factuais correntes reconciliadas; documentos históricos permanecem históricos. |
| AX. Store assets | BLOCKED_EXTERNAL | Pack auditado, mas ícone/feature graphic exigem edição e screenshots exigem recaptura da RC. |
| AY. Dados/fixtures/placeholders | READY_WITH_MANUAL_CHECK | Recovery sintético está ignorado e fora do artifact; validar build final e capturas sem dados pessoais/templates. |
| AZ. Legado remanescente | READY_WITH_MANUAL_CHECK | Rotas históricas são redirects/compatibilidade; APIs administrativas antigas ainda existem, mas não há fluxo participante legado ativo. |

## Blockers e riscos

### Blockers internos

Nenhum blocker interno conhecido após a 27.7.1. Revisão editorial e jurídica são aprovações humanas; MFA/0039 e contagens produtivas são verificações operacionais da 27.7.2.

### Blockers operacionais — Sprint 27.7.2

1. Consolidar e commitar o diff aprovado; executar Quality e PWA Release gates para o SHA exato.
2. Confirmar no ambiente `production`, sem revelar valores, `MFA_ENCRYPTION_KEY` e `D1_BACKUP_ENCRYPTION_KEY` como secrets independentes.
3. Obter backup cifrado/checksum antes de qualquer migration.
4. Executar `verify-promotable`; promover somente a migration pendente; executar `verify-final` e `compare`.
5. Confirmar ledger remoto até 0039, 984 perguntas e 380 conteúdos publicados/projetados/elegíveis, sem alterar conteúdo.
6. Promover exatamente o artifact validado para o SHA; validar provenance e rollback.
7. Executar smoke autenticado dos sete jogos nos modos FREE_PLAY/DAILY e um EVENT, MFA/owner, CMS, Health, Worker, Outbox e consumidores.
8. Registrar resultados sem secrets, dados pessoais ou dumps em artifacts públicos.

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

- `MFA_ENCRYPTION_KEY`: implementação exige 32 bytes em base64url; provisionamento produtivo **não comprovado no repositório**.
- migration 0039: presente, sequencial e coberta localmente; promoção produtiva **não comprovada nesta auditoria**.
- `D1_BACKUP_ENCRYPTION_KEY`: documentada como provisionada/custodiada no Environment `production`; não foi consultada.
- restore remoto: documentado como aprovado em D1 isolado e descartável em 12/08/2026.
- Cron/alertas: riscos operacionais futuros, não blockers internos da RC.
- conteúdos: pacote versionado contém 380 IDs únicos; `Quiz.csv` tem 1001 linhas, enquanto a disponibilidade de 984 itens universais permanece evidência operacional anterior a reconfirmar remotamente.
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
- documentos operacionais concordam sobre backup/restore, mas MFA/0039 continuam sem evidência produtiva atual;
- documentos históricos sobre fallback do Quiz são preservados como história e não representam o runtime atual.

Essas inconsistências são registradas, não corrigidas nesta auditoria.

## Critério de saída

`READY_FOR_27_7_1`: a auditoria encontrou uma baseline tecnicamente madura e uma lista finita de blockers. Não há impedimento para iniciar a sprint de fechamento interno, mas a aplicação ainda não está autorizada como RC pública nem Google Play Ready.
