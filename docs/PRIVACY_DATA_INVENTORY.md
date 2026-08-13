# Inventário de dados e privacidade — v2

**Status:** contrato técnico baseado no runtime e schema até `0039`; revisão humana/jurídica obrigatória.
**Não define base legal LGPD nem prazo jurídico definitivo.**

## Cobertura

`shared/operational-schema-contract.mjs` classifica as **70 tabelas** atuais. A exportação e o lifecycle derivam usuário e organização da sessão; o cliente não escolhe outro titular.

## Matriz real

| Categoria/dado | Finalidade técnica | Armazenamento | Retenção conhecida | Exposição | Terceiros/decisão humana |
|---|---|---|---|---|---|
| ID interno, organização, grupo, usuário e nome de exibição | conta, isolamento e identificação | D1 `users` | enquanto ativa; anonimização após fluxo aprovado | titular; admins da organização; nome/apelido pode aparecer em ranking/perfil | Cloudflare; fundamento/prazo `HUMAN_REVIEW_REQUIRED` |
| Apelido, bio, livro/versículo favorito, perfil público | personalização | D1 `users` | indefinida enquanto conta ativa | titular e conforme preferências públicas | opcional; política de visibilidade requer revisão |
| Hash/salt de senha | autenticação | D1 `users` | até troca/anonimização | nunca exportado/publicado | Cloudflare; segurança implementada |
| Cookie `quiz_session`, hash do token, persistência | sessão autenticada | cookie HttpOnly + D1 `sessions` | 12 horas ou 30 dias; removido no logout/revogação/anonimização | somente titular vê dispositivos sem token | Cloudflare |
| User-agent e hash de IP | sessão, consentimento, abuso/rate limit | D1 `sessions`, `legal_consents`, `abuse_counters` | prazo jurídico indefinido; sessões expiram, contadores possuem índice de limpeza | titular vê user-agent das sessões; admins/auditoria conforme permissão | Cloudflare; retenção `HUMAN_REVIEW_REQUIRED` |
| Consentimentos e versões | comprovação de aceite | D1 `legal_consents` | indefinida | exportação do titular/admin autorizado | base legal e prazo exigem revisão |
| MFA/TOTP cifrado, IV, versão de chave, passos e recovery codes com hash | segurança administrativa | D1 tabelas 0039 | enquanto MFA/conta existir e histórico necessário; ainda sem prazo aprovado | titular/owner por endpoints restritos; segredo não é exportado | Cloudflare; 0039 ainda não promovida |
| Tentativas, respostas, resultados, tempo, modos e participações | funcionamento, integridade e histórico | D1 Quiz/Core/participações | preservados/anonimizados conforme categoria | titular exporta; estatísticas públicas são limitadas | Cloudflare; prazos indefinidos |
| XP, nível, moedas, compras, inventário, equipamentos | progressão/economia virtual/idempotência | D1 Progress e ledgers | ledgers preservados pseudonimamente | titular e admins autorizados | sem pagamento/valor monetário; prazo exige revisão |
| Estatísticas, dias ativos, Daily, missões, conquistas e ranking | funcionalidades e analytics próprios | D1 | histórico pseudônimo; prazo indefinido | titular; rankings expõem nome escolhido e métricas limitadas | sem SDK externo de analytics |
| Eventos e objetivos diários | seleção, tentativa única e recompensas | D1 | histórico/idempotência; prazo indefinido | titular e administração da organização | Cloudflare |
| Notificações internas e recibo de leitura | comunicação dentro do produto | D1 | recibos removidos na anonimização; comunicados pertencem à organização | titular/admin | sem push provider externo confirmado |
| Conteúdo CMS, comentários, autoria/revisão e assets | operação editorial | D1; binários por URL HTTPS quando cadastrados | pertence à organização e não é apagado com autor | admins/editorial; conteúdo publicado aos participantes | host do asset exige revisão individual |
| Logs de auditoria e logs operacionais sanitizados | segurança, suporte e diagnóstico | D1 e observabilidade Cloudflare | prazo indefinido | administração autorizada; logs não são públicos | Cloudflare; prazo e acesso exigem revisão |
| Privacy requests | exercício de direitos e trilha de resolução | D1 | preservado após resolução; prazo indefinido | titular/admin autorizado | processo administrativo/humano |
| Backups cifrados | recuperação operacional | artifact/armazenamento controlado do workflow | alvo atual de até 30 dias, ainda sujeito a aprovação | operadores autorizados | GitHub Actions/Cloudflare conforme execução; custódia externa da chave |

## Dados não encontrados no runtime público

- e-mail ou telefone obrigatório para criação de conta;
- data de nascimento;
- localização precisa;
- contatos, fotos, câmera, microfone ou arquivos pessoais;
- publicidade, pagamentos ou SDK externo de tracking;
- analytics comportamental enviado a terceiro especializado.

`app/chatgpt-auth.ts` contém compatibilidade isolada para headers de ambiente OpenAI e não possui consumidor no runtime atual. O link do WhatsApp apenas abre compartilhamento voluntário do convite; o servidor não envia dados ao WhatsApp.

## Público-alvo e menores

- público-alvo formal da v2: adolescentes e adultos (`RESOLVED_PRODUCT_DECISION`);
- crianças não integram o público-alvo formal, mas não existe bloqueio técnico ou verificação etária que impeça acesso incidental;
- idade mínima jurídica definitiva, base legal e tratamento de dados de adolescentes: `HUMAN_LEGAL_REVIEW_REQUIRED`;
- consentimento parental, conta infantil, vínculo responsável/dependente e controles supervisionados: `NOT_IMPLEMENTED` / `POST_RELEASE`.

## Matriz técnica preliminar de retenção

Os intervalos abaixo são objetivos técnicos sujeitos à revisão jurídica e à análise de dependências de cada tabela. Não constituem prazo jurídico prometido nem autorização para limpeza automática.

| Classe | Finalidade/dependência | Política técnica pretendida | Remoção segura | Estado jurídico |
|---|---|---|---|---|
| `MUST_KEEP` | conta enquanto ativa; migrations; ledgers de XP/moedas/recompensas; checkpoints, receipts e registros necessários a saldos, progressão, idempotência, segurança, reconstrução e integridade referencial | preservar enquanto necessários à conta ou às finalidades de integridade/segurança; não excluir apenas por idade | não, sem prova de substituição e análise por tabela | `HUMAN_LEGAL_REVIEW_REQUIRED` para fundamento e prazo |
| `RETENTION_CANDIDATE` | sessões expiradas, challenges/recovery usados ou expirados, notificações lidas, Outbox resolvida e logs operacionais elegíveis | objetivo futuro de 30–90 dias conforme categoria | somente após dependências, incidentes, auditoria e restauração serem avaliados | `HUMAN_LEGAL_REVIEW_REQUIRED` |
| `AGGREGATE_THEN_RETIRE` | participações/usage antigos, atividade granular e detalhes analíticos que possam ser substituídos por agregados confiáveis | objetivo futuro de 12–18 meses para detalhes elegíveis, preservando agregados necessários | potencialmente, após agregação verificada e decisão por domínio | `HUMAN_LEGAL_REVIEW_REQUIRED` |
| `EPHEMERAL` | dados temporários sem obrigação funcional após expiração, quando comprovado por contrato | menor retenção tecnicamente segura dentro do objetivo de 30–90 dias ou do prazo específico já implementado | somente quando expiração, idempotência e segurança estiverem comprovadas | `HUMAN_LEGAL_REVIEW_REQUIRED` quando houver dado pessoal |

Nenhum job, TTL, `DELETE` automático ou descarte foi implementado. Backups seguem política operacional própria e não tornam essas classes executáveis.

## Inatividade

- v2 não excluirá contas automaticamente por inatividade (`RESOLVED_PRODUCT_DECISION`);
- pedido de exclusão pelo usuário continua `IMPLEMENTED`;
- prazo de inatividade, aviso prévio e anonimização/exclusão automática são `POST_RELEASE` / `HUMAN_LEGAL_REVIEW_REQUIRED`.

## Fornecedores e possível processamento internacional

- Cloudflare: runtime, Pages/Workers, D1 e observabilidade; pode processar dados da aplicação conforme o serviço utilizado;
- GitHub: código-fonte, CI, artifacts de build e, quando o workflow correspondente for executado, artifacts operacionais/backups cifrados; não é endpoint de analytics dos participantes;
- custódia externa de chaves: separada dos dados e dos repositórios, conforme runbooks.

Esses papéis não significam que todos os fornecedores recebem os mesmos dados. Localização física, países, mecanismos jurídicos, cláusulas e bases legais não foram comprovados neste repositório e permanecem `HUMAN_LEGAL_REVIEW_REQUIRED`.

## Direitos do usuário

| Direito/capacidade | Estado | Evidência/limite |
|---|---|---|
| visualizar/exportar dados | `IMPLEMENTED` | `GET /api/privacy/me`, sem hashes/tokens/segredos |
| alterar dados básicos | `PARTIAL` | perfil básico editável; organização, papel e identificador exigem admin |
| revogar sessão/logout | `IMPLEMENTED` | logout e remoção individual de sessões |
| solicitar exclusão | `IMPLEMENTED` | titular confirma senha e cria pedido |
| executar exclusão/anonimização | `HUMAN_PROCESS_REQUIRED` | admin da organização confirma e preserva ledgers/FKs pseudônimos |
| exclusão física imediata integral | `NOT_IMPLEMENTED` | incompatível com integridade atual; requer decisão jurídica |
| contas inativas | `NOT_IMPLEMENTED` | sem regra automática aprovada |
| contato para direitos | `IMPLEMENTED` | `suporteconteosfeitos@gmail.com` é o canal institucional aprovado para suporte, privacidade e direitos |

## Decisões obrigatórias

Fundamentos LGPD, prazos jurídicos por categoria, tratamento de adolescentes, acesso incidental por crianças, mecanismo/base legal de transferência internacional, restauração pós-exclusão, necessidade de endereço físico e identidade formal adicional quando exigida são `HUMAN_REVIEW_REQUIRED`. O tipo de controlador, o contato institucional, o público-alvo formal, a ausência de exclusão automática por inatividade e a matriz técnica preliminar estão resolvidos como decisões de produto para a fase atual.
