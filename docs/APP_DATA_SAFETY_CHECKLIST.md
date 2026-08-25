# Matriz técnica — Google Play Data Safety

**DRAFT_FACTUAL_READY / HUMAN_REVIEW_REQUIRED / HUMAN_CONSOLE_REVIEW_REQUIRED.** A auditoria técnica 27.7.5F confirmou esta matriz contra o runtime, mas ela deve ser reconciliada por humano com as definições e perguntas vigentes do Play Console no momento do envio.

| Categoria técnica | Coletado | Compartilhado | Finalidade | Obrigatório/opcional | Proteção observada | Exclusão |
|---|---|---|---|---|---|---|
| Nome/identificador de usuário | sim | somente operador de infraestrutura | conta, autenticação, perfil e ranking | obrigatório para conta; apelido/bio opcionais | HTTPS, isolamento organizacional e acesso server-side | pedido + anonimização administrativa |
| E-mail | não no cadastro normal | não | não aplicável | não aplicável | compatibilidade OpenAI dormente não consumida | não aplicável ao runtime atual |
| Credenciais | sim, hash/salt e tokens hasheados | operador de infraestrutura | segurança/autenticação | obrigatório | cookie HttpOnly/Secure/SameSite, hashes e MFA cifrado | removidos/revogados no lifecycle aplicável |
| Informações de dispositivo | user-agent; hash de IP | operador de infraestrutura | sessão, abuso, consentimento e segurança | automático/necessário | IP não armazenado em claro pela aplicação | sessão removível; prazo do histórico requer revisão |
| Atividade no app | sim | operador de infraestrutura | jogos, Daily, Eventos, missões e integridade | necessário à funcionalidade | autoridade do servidor, D1 e idempotência | exportável; histórico pseudônimo pode ser preservado |
| Desempenho/analytics | sim, próprios | não com SDK de analytics | estatísticas e administração agregada | necessário à plataforma | tenant-scoped; admin recebe agregados | exportável/anonimizado conforme lifecycle |
| Compras | não há pagamento real | não | economia virtual apenas | não aplicável | ledgers internos | exportável; preservação pseudônima |
| Mensagens/comunicações | avisos internos e recibos | não | comunicação do produto | funcional | sem push externo | recibos removidos na anonimização |
| Conteúdo do usuário/editorial | apenas usuários autorizados | pode ser exibido dentro da organização | CMS e Eventos | opcional por papel | RBAC, auditoria e versionamento | conteúdo pertence à organização; contribuição é exportada |
| Localização, contatos, fotos, áudio, câmera, saúde, finanças | não encontrado | não | não aplicável | não aplicável | Permissions Policy bloqueia câmera/microfone/geolocalização | não aplicável |

## Proteções e terceiros

- tráfego HTTPS e headers de segurança;
- Cloudflare Pages/Workers/D1 como operador de runtime;
- GitHub para código, CI e artifacts operacionais, não como endpoint de analytics de participantes;
- nenhum SDK de anúncios, pagamento, crash analytics ou tracking de terceiros encontrado;
- compartilhamento via WhatsApp é voluntário e iniciado pelo admin no navegador.

Cloudflare participa do runtime/D1/observabilidade. GitHub participa de código, CI e artifacts operacionais e pode armazenar artifacts cifrados quando workflows específicos os produzem; não recebe automaticamente todos os dados do runtime. Possível processamento internacional é reconhecido tecnicamente, mas países, regiões, mecanismos e bases legais não estão definidos pelo repositório.

O produto não é direcionado formalmente a crianças na v2; seu público-alvo definido é adolescente e adulto. Isso não prova bloqueio técnico de acesso infantil nem define faixa etária jurídica. O proprietário/revisor deve decidir como o Play Console classifica “coletado”, “compartilhado”, processamento por prestador, tratamento de adolescentes, acesso incidental por crianças, retenção, exclusão e processamento internacional. Este arquivo não deve ser copiado cegamente para o formulário nem usado para adesão automática ao Families.
