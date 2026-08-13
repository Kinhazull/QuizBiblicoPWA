# Readiness jurídico e Google Play — v2

| Classe | Estado |
|---|---|
| `TECHNICAL_GO` | exportação, sessões, pedido/anonimização, consentimento versionado, PWA production-like, cache seguro, manifest e inventário técnico |
| `HUMAN_REVIEW_REQUIRED` | identidade formal adicional/endereço físico quando juridicamente necessários, bases legais, retenção, tratamento de adolescentes/acesso incidental por crianças, transferência internacional, documentos finais, Data Safety e classificação |
| `LEGAL_BLOCKER` | aprovação pública dos Termos/Privacidade; licenças do acervo/textos/assets; revisão jurídica sobre adolescentes/acesso incidental por crianças e direitos do titular |
| `PLAY_STORE_BLOCKER` | domínio, package ID, assinatura, DAL, AAB, target SDK vigente, Android físico, listing, Data Safety e classificação |
| `POST_RELEASE` | imagens da Memória, Bíblia completa/múltiplas traduções, Wordle 2.0 e recursos nativos sem requisito atual |

Textos bíblicos integrais sem licença comprovada e seus derivados não integram mais a árvore ativa. Isso resolve o bloqueio técnico de distribuição pelo release atual; continuam humanos/jurídicos a decisão de purge histórico, qualquer uso futuro das traduções e a revisão de citações públicas específicas. Os acervos de 984 perguntas e 380 conteúdos são conteúdo original da plataforma, assistido por IA e curado humanamente.

## Estado LGPD funcional

- exportação: `IMPLEMENTED`;
- alteração de perfil: `PARTIAL`;
- logout/revogação: `IMPLEMENTED`;
- pedido de exclusão: `IMPLEMENTED`;
- resolução/anonimização: `HUMAN_PROCESS_REQUIRED`;
- contas inativas: `NOT_IMPLEMENTED`;
- tipo de controlador: `RESOLVED` — pessoa física responsável pelo projeto;
- contato institucional: `RESOLVED` — `suporteconteosfeitos@gmail.com`.
- público-alvo v2: `RESOLVED_PRODUCT_DECISION` — adolescentes e adultos; crianças não são público-alvo formal.
- controles infantis/contas supervisionadas: `NOT_IMPLEMENTED` / `POST_RELEASE`.
- contas inativas: `RESOLVED_PRODUCT_DECISION` — nenhuma exclusão automática na v2; pedido de exclusão permanece implementado.
- retenção: `RESOLVED_PRODUCT_DECISION` — matriz técnica preliminar definida, sem limpeza automática; prazos jurídicos continuam pendentes.
- processamento internacional: `RESOLVED_PRODUCT_DECISION` — possibilidade reconhecida; mecanismo/base legal seguem `HUMAN_LEGAL_REVIEW_REQUIRED`.

## Ações do proprietário antes da 27.7

1. nomear revisor jurídico e confirmar eventual identidade formal adicional e necessidade de endereço físico, sem publicar CPF ou endereço residencial;
2. aprovar fundamentos, prazos jurídicos de retenção, tratamento de adolescentes, acesso incidental por crianças e mecanismo/base legal de transferência internacional;
3. revisar e publicar versões finais de Termos, Privacidade e nota editorial;
4. resolver os blockers de licença e arte da Sprint 27.5;
5. decidir domínio HTTPS e package ID sem reutilização indevida;
6. executar checklist Android físico e medir Web Vitals no domínio candidato;
7. confirmar políticas vigentes do Google Play, target SDK, Data Safety e classificação;
8. decidir custódia de assinatura/Play App Signing e preparar DAL/AAB apenas depois;
9. registrar Go/No-Go humano com data, versão e escopo.

Até essas ações, a decisão permanece **NO-GO para publicação pública/Google Play**.
