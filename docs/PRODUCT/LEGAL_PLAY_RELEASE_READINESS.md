# Readiness jurídico e Google Play — v2

| Classe | Estado |
|---|---|
| `TECHNICAL_GO` | auditoria técnica 27.7.5F concluída; exportação, sessões, pedido/anonimização, consentimento versionado, PWA production-like, cache seguro, manifest e inventário técnico |
| `HUMAN_REVIEW_REQUIRED` | identidade/endereço quando necessários, bases legais, retenção, suficiência da autodeclaração 18+, transferência internacional, documentos finais, Data Safety e classificação |
| `LEGAL_BLOCKER` | aprovação pública dos Termos/Privacidade; licenças do acervo/textos/assets; revisão jurídica da política 18+ e direitos do titular |
| `PLAY_STORE_BLOCKER` | domínio, package ID, assinatura, DAL, AAB, target SDK vigente, listing, Data Safety, classificação e URL pública de exclusão de conta |
| `POST_RELEASE` | imagens futuras da Memória, decisão sobre Bíblia completa/múltiplas traduções, automação de retenção/SBOM e recursos nativos sem requisito atual |

Textos bíblicos integrais sem licença comprovada e seus derivados não integram mais a árvore ativa. Isso resolve o bloqueio técnico de distribuição pelo release atual; continuam humanos/jurídicos a decisão de purge histórico, qualquer uso futuro das traduções e a revisão de citações públicas específicas. A baseline editorial ativa possui 5.485 conteúdos publicados/projetados/AVAILABLE, com autoria interna, assistência de IA, curadoria e aprovação editorial do proprietário; essa aprovação não substitui a revisão jurídica.

## Estado LGPD funcional

- exportação: `IMPLEMENTED`;
- alteração de perfil: `PARTIAL`;
- logout/revogação: `IMPLEMENTED`;
- pedido de exclusão: `IMPLEMENTED`;
- resolução/anonimização: `HUMAN_PROCESS_REQUIRED`;
- contas inativas: `NOT_IMPLEMENTED`;
- tipo de controlador: `RESOLVED` — pessoa física responsável pelo projeto;
- contato institucional: `RESOLVED` — `suporteconteosfeitos@gmail.com`.
- público-alvo v2: `RESOLVED_PRODUCT_DECISION` — `ADULTS_ONLY_18_PLUS`, com confirmação explícita no cadastro e na reaceitação.
- controles infantis/contas supervisionadas: `NOT_IMPLEMENTED` / `POST_RELEASE`.
- contas inativas: `RESOLVED_PRODUCT_DECISION` — nenhuma exclusão automática na v2; pedido de exclusão permanece implementado.
- retenção: `RESOLVED_PRODUCT_DECISION` — matriz técnica preliminar definida, sem limpeza automática; prazos jurídicos continuam pendentes.
- processamento internacional: `RESOLVED_PRODUCT_DECISION` — possibilidade reconhecida; mecanismo/base legal seguem `HUMAN_LEGAL_REVIEW_REQUIRED`.

## Ações do proprietário antes do Go/No-Go

1. nomear revisor jurídico e confirmar eventual identidade formal adicional e necessidade de endereço físico, sem publicar CPF ou endereço residencial;
2. aprovar fundamentos, prazos jurídicos, suficiência da autodeclaração 18+ e mecanismo/base legal de transferência internacional;
3. revisar e publicar versões finais de Termos, Privacidade e nota editorial;
4. aprovar juridicamente a proveniência/licença já inventariada e reconciliar metadados históricos de assets;
5. decidir domínio HTTPS e package ID sem reutilização indevida;
6. preservar a evidência já aprovada de Android físico/PWA e revalidar apenas se o artifact mudar;
7. confirmar políticas vigentes do Google Play, target SDK, Data Safety, classificação e URL pública de exclusão;
8. decidir custódia de assinatura/Play App Signing e preparar DAL/AAB apenas depois;
9. registrar Go/No-Go humano com data, versão e escopo.

Até essas ações, a decisão permanece **NO-GO para publicação pública/Google Play**.
