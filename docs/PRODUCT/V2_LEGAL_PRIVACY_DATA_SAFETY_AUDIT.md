# Auditoria técnica jurídica, privacidade, licenças e Data Safety — v2.0.0

**Sprint:** 27.7.5F  
**Data:** 24/08/2026  
**Estado:** `TECHNICALLY_FINAL / HUMAN_LEGAL_REVIEW_REQUIRED`
**Natureza:** diagnóstico técnico e factual; não constitui parecer jurídico nem autorização de publicação.

## 1. Escopo e evidência

A auditoria confrontou o runtime, contratos de autenticação e privacidade, documentação de release, conteúdo editorial, manifests de assets, dependências e as páginas públicas de Termos e Privacidade. A inspeção começou com `main` limpa quanto aos arquivos do produto, HEAD `6744edc76629b9b1161db7a9b281090ecef6990e`; os arquivos efêmeros `.pnpm-store/v11/index.db-shm` e `.pnpm-store/v11/index.db-wal` já estavam removidos e não foram alterados nesta tarefa.

As páginas públicas responderam sem autenticação:

- `https://quizbiblicopwa.pages.dev/privacidade/`: HTTP 200, HTML UTF-8, H1 “Política de Privacidade”;
- `https://quizbiblicopwa.pages.dev/termos/`: HTTP 200, HTML UTF-8, H1 “Termos de Uso”.

O repositório está em SHA posterior ao último runtime formalmente documentado (`98b0dc45cbbeb36d9a979c5558d531744878c83c`). Portanto, acessibilidade pública foi confirmada, mas não se atribui o HEAD local ao artifact publicado sem nova cadeia Release Truth.

## 2. Mapa factual de dados

| Grupo | Dados | Finalidade | Autoridade/armazenamento | Exportação/exclusão |
|---|---|---|---|---|
| Conta e perfil | nome, usuário, apelido, biografia, preferências e consentimentos | conta, identidade e personalização | servidor/D1, organização autenticada | exportável; pedido de anonimização |
| Autenticação | hash/salt de senha, sessão hasheada, user-agent, hash de IP | login, sessão, abuso e segurança | cookie `quiz_session` HttpOnly/Secure/SameSite; D1 | sessões revogáveis; segredos não exportados |
| MFA administrativo | segredo TOTP cifrado, IV, versão de chave, passo anti-replay e recovery codes com hash | proteção de contas administrativas | D1, migration 0039, chave independente | segredo/hashes não exportados; lifecycle de segurança |
| Atividade | partidas, respostas, resultados, seleções, participações, Daily/Event, estatísticas | funcionamento dos jogos e integridade | servidor/D1, isolamento por organização | exportável; histórico pode permanecer pseudônimo |
| Progressão/economia | XP, moedas, missões, conquistas, inventário e equipamentos | progressão e economia virtual | ledgers server-side | exportável; preservação pseudônima após anonimização |
| Comunicação | notificações internas e recibos | informar eventos do produto | D1 | recibos tratados na anonimização |
| Conteúdo editorial | autoria, revisão, versões, eventos e contribuições CMS | gestão de conteúdo por papéis autorizados | D1, RBAC e auditoria | contribuição exportável; conteúdo pertence à organização |
| Operação | logs/observabilidade, backups cifrados e artifacts operacionais | disponibilidade, diagnóstico e recuperação | Cloudflare/GitHub conforme o fluxo | prazos jurídicos ainda exigem aprovação humana |

Não foram encontrados coleta funcional de localização precisa, contatos, câmera, microfone, fotos, áudio, saúde, dados financeiros ou pagamentos. A economia é exclusivamente virtual e sem valor monetário.

## 3. Terceiros e transferências

- **Cloudflare Pages/Workers/D1/observabilidade:** operador técnico do runtime e persistência.
- **GitHub:** código, CI e artifacts operacionais; workflows específicos podem armazenar backups cifrados privados.
- **WhatsApp:** somente link de compartilhamento iniciado explicitamente pelo usuário; não é SDK de tracking embutido.
- **Asset Registry:** pode referenciar URL HTTPS fornecida por administrador; cada host e licença externos exigem validação humana antes do uso público.
- **IA:** bindings/superfícies de sugestão permanecem dormentes; não há evidência de envio automático de dados de participantes para serviço de IA.

Não foram encontrados SDKs de anúncios, pagamento, crash analytics ou rastreamento de terceiros. O processamento internacional é tecnicamente possível pela infraestrutura, mas mecanismo, regiões e base legal permanecem decisão jurídica humana.

## 4. Cookies, armazenamento local e cache

- cookie de sessão `quiz_session`, definido pelo servidor, HttpOnly, Secure em produção e SameSite=Lax;
- `sessionStorage` somente para resultado temporário da última partida, limpo no logout;
- nenhum uso operacional geral de `localStorage`, IndexedDB ou cookies client-side foi identificado;
- Service Worker trata `/api/*` como network-only, usa cache para shell/static e navegação network-first com fallback offline;
- respostas protegidas e payloads sensíveis não são destinados ao cache público.

## 5. Coerência entre documentos e runtime

### Política de Privacidade

A página pública descreve de forma compatível as categorias principais, Cloudflare/GitHub, exportação, pedido de exclusão/anonimização, retenção pseudônima, ausência de venda e público adolescente/adulto. Ela declara corretamente que ainda exige revisão jurídica humana. Permanecem decisões humanas sobre bases legais, prazos, transferência internacional, identidade formal adicional quando necessária e tratamento de acesso infantil incidental.

### Termos de Uso

Os Termos refletem os sete jogos, progressão, economia virtual sem valor monetário, segurança da conta, abuso, conteúdo organizacional, exportação/anonimização e público-alvo. Não foi encontrada promessa incompatível com pagamento real ou monetização. O texto continua corretamente marcado como versão técnica pendente de aprovação jurídica.

## 6. Direitos do titular e segurança

- exportação autenticada implementada em `GET /api/privacy/me`, sem hashes, tokens, sessões, recovery codes ou respostas protegidas;
- pedido de exclusão autenticado e confirmado por senha;
- execução administrativa exige `privacy.manage`, organização correta, senha administrativa e confirmação literal `ANONIMIZAR_CONTA`;
- a resolução anonimiza a conta, revoga sessões e preserva ledgers pseudônimos necessários à integridade;
- recuperação usa códigos com expiração/single-use, revoga sessões e controles anteriores;
- MFA/TOTP administrativo está promovido no schema 0039, cifrado e protegido contra replay.

Para Google Play, falta uma URL pública dedicada de solicitação/instruções de exclusão que possa ser informada no Console sem depender de login no app. O fluxo autenticado atual continua válido para o produto, mas não prova sozinho conformidade com o formulário vigente da loja.

## 7. Público-alvo e menores

A decisão de produto é `ADULTS_ONLY_18_PLUS`. Cadastro e reaceitação exigem confirmação separada, explícita e não pré-marcada de 18 anos ou mais, sem coletar data de nascimento. Crianças e adolescentes não integram o público-alvo e o produto não deve aderir ao Families. A suficiência jurídica dessa autodeclaração e o preenchimento do Play Console exigem revisão humana.

## 8. Conteúdo bíblico e proveniência

- textos bíblicos integrais ACF/Almeida e quatro derivados sem licença comprovada foram removidos da árvore ativa;
- ACF permanece `BLOCKED_FOR_REDISTRIBUTION`; Almeida permanece `PENDING_HUMAN_REVIEW` para qualquer uso futuro;
- referências históricas no Git não foram reescritas; eventual purge é decisão humana/jurídica;
- o acervo ativo é declarado como conteúdo original da plataforma, assistido por IA, curado e aprovado humanamente pelo proprietário;
- baseline editorial documentada: Quiz 984; Wordle 1.201 publicados/1.200 elegíveis; Timeline 800; Memória 100 conteúdos/300 pares; Associação 800; Quem Sou Eu 800; Três Pistas 800; total 5.485 publicados/projetados/AVAILABLE;
- a aprovação editorial do proprietário não substitui revisão jurídica de citações, traduções e risco autoral.

## 9. Assets e propriedade intelectual

O Asset Pack v2 e os 16 colecionáveis ativos têm proveniência interna registrada como `AI_ASSISTED`, `HUMAN_CURATED` e `INTERNAL_USE_CONFIRMED`. URLs externas do Asset Registry continuam condicionadas à prova de licença e host. Metadados históricos de manifests que ainda indiquem `REPLACE_BEFORE_RELEASE` devem ser reconciliados com o manifest v2 vigente antes do Go/No-Go; isso é integridade documental, não prova de asset ausente no runtime.

## 10. Dependências e avisos de terceiros

O aviso VERO/LibreOffice pt-BR usado para gerar o léxico offline do Wordle está registrado em `docs/THIRD_PARTY_NOTICES.md`, com origem e licenças LGPL v3+/MPL. A inspeção de manifests instalados encontrou predominantemente MIT/Apache/BSD, além de MPL-2.0, CC-BY-4.0 e combinação Apache/LGPL em componentes de tooling/build. Não foi encontrado pacote AGPL ou proprietário nessa amostra.

`pnpm licenses list --json` não produziu inventário completo por ausência de índice local para `@axe-core/playwright`. Assim, um SBOM/relatório determinístico completo e a decisão sobre avisos distribuídos permanecem aprovação humana antes da publicação. O `THIRD_PARTY_NOTICES.md` é necessário e deve ser preservado.

## 11. Matriz factual para Google Play Data Safety

| Categoria Play a reconciliar | Estado factual | Coleta/compartilhamento técnico | Finalidade |
|---|---|---|---|
| Informações pessoais | nome/identificador; perfil opcional | Cloudflare como operador | conta, perfil, ranking |
| Segurança | credenciais protegidas, sessão, MFA, UA e hash de IP | Cloudflare como operador | autenticação, fraude e segurança |
| Atividade no app | partidas, respostas, progresso, eventos e economia virtual | Cloudflare como operador | funcionalidade, integridade e analytics próprios |
| Conteúdo do usuário | contribuições editoriais somente por papel autorizado | dentro da organização/infraestrutura | CMS e Eventos |
| App info/performance | métricas operacionais e agregadas próprias | infraestrutura operacional | diagnóstico e administração |
| Compras/dados financeiros | ausentes | não | não aplicável |
| Localização/contatos/mídia/saúde | ausentes no runtime auditado | não | não aplicável |
| Publicidade/trackers | ausentes | não | não aplicável |

Proteções observadas: HTTPS, RBAC, isolamento organizacional, autoridade server-side, idempotência, hashes/cifra e pedido de exclusão. Perfil extra é opcional; dados essenciais de conta, segurança e atividade são necessários ao serviço. A classificação “coletado” versus “compartilhado”, inclusive prestadores, deve ser respondida por humano conforme as definições vigentes do Console.

**Status Data Safety:** `DRAFT_FACTUAL_READY / HUMAN_CONSOLE_REVIEW_REQUIRED`.

## 12. Classificação final

### WEB_V2_BLOCKERS

1. aprovação jurídica humana das versões finais de Termos e Privacidade;
2. aprovação humana das bases legais, retenção conservadora e posição de transferência internacional documentadas;
3. fechamento humano de licenças/citações, manifests de assets e inventário completo de dependências/avisos;
4. Release Truth/Quality do SHA final após qualquer alteração de runtime ou documento incluído no artifact.

### GOOGLE_PLAY_BLOCKERS

1. todos os blockers web aplicáveis;
2. domínio/package ID, assinatura, DAL, AAB e target SDK vigentes;
3. Data Safety, Target Audience, classificação indicativa e Store Listing aprovados no Console;
4. URL pública de exclusão de conta compatível com a exigência vigente do Play;
5. confirmação humana de políticas de menores/Families e dos avisos/licenças distribuídos.

### HUMAN_APPROVALS

- revisor jurídico, identidade formal adicional/endereço quando realmente exigidos;
- bases legais, retenção, transferência internacional e direitos do titular;
- eficácia jurídica e redação final da política 18+;
- Termos, Privacidade, Data Safety e classificação;
- licenças de traduções/citações, assets externos, dependências e eventual purge histórico;
- Go/No-Go com versão, SHA, data e escopo.

### POST_RELEASE

- automação de retenção/inatividade após aprovação dos prazos;
- contas supervisionadas/age gate somente se a estratégia de público mudar;
- SBOM/licenças automatizados e monitoramento periódico;
- decisão sobre purge do histórico Git e traduções bíblicas futuras;
- telemetria externa apenas com nova decisão de privacidade;
- reavaliação FIELD/CrUX após tráfego suficiente.

## 13. Decisão

**Alinhamento técnico concluído.** A 27.7.5F.1E implementa confirmação 18+, reaceitação versionada idempotente, documentos públicos revisados e URL pública de exclusão, sem migration. O estado é `TECHNICALLY_FINAL / HUMAN_LEGAL_REVIEW_REQUIRED`; permanece **NO-GO** até aprovação humana e blockers externos.
