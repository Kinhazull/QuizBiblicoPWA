# Google Play / Android Readiness

**Status:** `PLAY_STORE_BLOCKER` até decisões humanas e validação física. Nenhum app Android foi criado ou publicado.

## Estratégia recomendada

1. lançar e estabilizar primeiro a PWA HTTPS;
2. validar `docs/ANDROID_PHYSICAL_CHECKLIST.md` em aparelho real;
3. empacotar como **Trusted Web Activity com Bubblewrap** após domínio, package ID e assinatura estarem definidos;
4. usar wrapper Android próprio somente se surgir requisito nativo real.

TWA mantém uma base Web e o modelo de custo mínimo. Um wrapper próprio duplica segurança, runtime e releases sem necessidade confirmada. Instalação direta da PWA continua alternativa válida fora da Play Store.

## Decisões e artifacts pendentes

| Item | Estado |
|---|---|
| Nome “Conte os Feitos” | definido |
| package/application ID | `HUMAN_DECISION_REQUIRED`; nenhuma proposta é reserva ou decisão oficial |
| domínio HTTPS canônico | `HUMAN_DECISION_REQUIRED` |
| conta Play Console | não criada/auditada nesta sprint |
| app signing/keystore | não gerado; decidir custódia e aderir ao Play App Signing |
| Digital Asset Links | impossível sem domínio, package ID e fingerprint; publicar em `/.well-known/assetlinks.json` somente depois |
| Android App Bundle | não gerado |
| target SDK | confirmar requisito vigente no Play Console no momento da submissão (`HUMAN_REVIEW_REQUIRED`) |
| ícones | PWA possui 192/512/maskable; validar recorte e produzir assets Play exigidos |
| splash/branding | cores/identidade existem; validar TWA/Android real |
| permissões | nenhuma permissão nativa necessária no escopo atual; câmera/microfone/geolocalização estão bloqueados |
| deep links | somente escopo Web atual; decidir rotas suportadas antes de configurar intent filters |
| offline | fallback público apenas; login/jogos/progressão exigem rede |
| login/atualização | contratos PWA automatizados; Android físico pendente |
| público-alvo v2 | adolescentes e adultos; crianças não são público-alvo formal (`RESOLVED_PRODUCT_DECISION`) |
| Target Audience and Content | faixas exatas e consequências jurídicas/políticas são `HUMAN_REVIEW_REQUIRED`; nenhuma resposta foi submetida |
| Families | não aderir automaticamente; suporte infantil/supervisionado é `POST_RELEASE` |

## Sequência segura futura

1. aprovar documentos jurídicos, Data Safety, classificação indicativa, tratamento de adolescentes e acesso incidental por crianças;
2. escolher/controlar domínio e package ID;
3. concluir arte final e store listing;
4. executar checklist Android físico na PWA;
5. criar projeto Bubblewrap local, assinatura protegida e `assetlinks.json` correspondente;
6. testar AAB em faixa interna fechada;
7. preencher Data Safety e classificação com revisão humana;
8. somente então promover para testes/produção no Play Console.

Não inventar certificado, domínio, package ID, target SDK ou respostas de política antes dessas decisões.

## Wave 7 — readiness visual do Asset Pack v2

**Auditoria concluída em 13/08/2026; assets ainda não prontos para upload.** A fonte detalhada é `docs/PRODUCT/ASSET_ADOPTION_AUDIT.md` e o inventário verificável está em `docs/PRODUCT/ASSET_PACK_V2_MANIFEST.json`.

- `play-store-icon.png`: exige exportação humana 512×512, PNG 32-bit com alpha, até 1024 KB e validação do recorte/safe zone.
- `feature-graphic.png`: exige recomposição/exportação humana 1024×500 em JPEG ou PNG 24-bit sem alpha, preservando o foco nas zonas seguras.
- cinco templates de screenshots: exigem captura da RC real; hoje possuem tela vazia, alpha e 941×1672.
- `banner.png`: marketing opcional, não tratado como asset obrigatório da listagem de telefone.
- `QR.png`: marketing opcional; não contém QR verificável e não deve ser usado antes de existir destino oficial.

Requisitos visuais foram conferidos na documentação oficial [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en). Devem ser reconfirmados no Play Console no momento da submissão. Esta auditoria não altera o status geral `PLAY_STORE_BLOCKER`.
