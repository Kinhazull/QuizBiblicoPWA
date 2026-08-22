# Problemas conhecidos

**Status:** CURRENT — somente riscos atuais ou validações pendentes.

| ID | Tema | Severidade | Estado / próximo passo |
|---|---|---|---|
| KI-ASSET-001 | Limpeza de assets antigos | Baixa | `app-icon.svg`, PNGs antigos de app icon e `favicon.svg` foram substituídos no runtime; retirar somente após confirmar ausência de consumidores externos. |
| KI-ASSET-002 | Splash Brand v2 | Planejada | `splash-brand.png` permanece disponível, sem adoção: não existe splash nativa separada e não será criado atraso artificial. |
| KI-ASSET-003 | QA de artes em aparelho real | Baixa | Os sete jogos foram validados em desktop/mobile automatizados; confirmar nitidez e custo de transferência no aparelho Android físico da release. |
| KI-001 | Android real | Release blocker externo | SW/cache/offline/update passaram no runtime local production-like; executar checklist de instalação, background, lock/unlock e atualização em aparelho físico. |
| KI-003 | Jurídico e licenças | Release blocker humano | ACF/Almeida completas e derivados foram retirados da árvore ativa. Restam decisão sobre purge histórico, qualquer uso futuro dessas traduções, citações públicas específicas, adolescentes/acesso infantil incidental, termos e Data Safety. A autoria interna dos acervos de 984 e 380 itens foi declarada. |
| KI-004 | Asset Registry × CSP | Alto | Para a v2, aprovar somente hosts/assets controlados com proveniência; não ampliar CSP para URLs externas desconhecidas. |
| KI-015 | LGPD/documentos v2 | Release blocker jurídico | Controlador, contato, público-alvo, ausência de exclusão por inatividade e matriz técnica de retenção estão resolvidos; ainda aprovar identidade/endereço se exigidos, bases e prazos legais, adolescentes/acesso infantil incidental, mecanismo internacional, Termos e Privacidade v2. |
| KI-016 | Google Play | Release blocker externo/humano | Decidir domínio/package ID, assinatura, DAL, target SDK vigente, Data Safety, classificação e validar Android físico antes de gerar AAB. |
| KI-005 | Legado preservado | Médio | Jornada/Medalhas e Analytics antigo redirecionam para superfícies modernas; APIs/dados históricos e perfil público legado permanecem até prova de não uso ou decisão de produto. |
| KI-007 | Custo e retenção | Médio | Matriz preliminar existe e não representa economia realizada; preencher quotas/consumo e obter aprovação jurídica/técnica por tabela antes de qualquer automação. |
| KI-008 | Alertas e heartbeat | Risco aceito / pós-release | Health/logs e sinais indiretos existem, mas não há heartbeat persistido do Cron, monitor externo ou alerta proativo. Não bloqueia RC controlada; reavaliar solução de custo zero após observação real. |
| KI-009 | Advisory transitivo temporário | Baixo | Revisar periodicamente `GHSA-mh99-v99m-4gvg`; manter exceção exclusiva até existir correção upstream compatível. |
| KI-011 | Recuperação do owner | Médio | Recovery codes existem; perda simultânea de senha, TOTP e códigos do owner depende de procedimento operacional externo controlado. |
| KI-012 | Advisories transitivos de `image-size` | Baixo | `vinext` fixa `image-size@2.0.2`; a correção anunciada `2.0.3` ainda não foi publicada. Exceções restritas a `GHSA-w3rx-r6r6-pgpr` e `GHSA-5p2g-fcmc-qvqq`, somente para assets locais controlados no build, devem ser removidas assim que o upstream corrigir a cadeia. |
| KI-018 | Revalidação da rodada mobile | Release gate | Correções de Home, Perfil, Loja, Inventário, catálogo, Daily, jogos e Administração estão na `main`; repetir smoke visual/funcional em 320–390 px no artifact promovido antes do Go/No-Go. |
| KI-019 | Conteúdo Wordle v2 em produção | Verificação operacional | O pacote de 153 conteúdos está aprovado e versionado. Confirmar por dry-run/aplicação administrativa idempotente e contagem CMS/Biblioteca que a publicação real ocorreu; não inferir pelo Git. |
| KI-020 | Registro de resultado em rede móvel | Revalidação | Retry limitado e conclusão idempotente foram implementados após falha intermitente observada. Validar no runtime promovido e confirmar ausência de duplicação de XP, moedas ou estatísticas. |

## Encerrados

- decisão e implementação do Ranking Universal;
- “migration 0037 pendente” como afirmação geral. O estado remoto agora é sempre obtido operacionalmente e a migration local mais recente é 0038.
- KI-002: restore remoto comprovado em D1 isolado e descartável com dataset sintético; produção não foi restaurada;
- KI-013: `D1_BACKUP_ENCRYPTION_KEY` v1 provisionada no Environment `production` e custodiada externamente.
- KI-014: os 16 colecionáveis usam `CollectibleArt`; aliases `frame-covenant`→`frame-aliance` e `frame-royal`→`frame-real` estão aprovados e testados.
- KI-017: Brand v2/PWA integrada na Wave 1 e validada por contrato; Android físico permanece KI-001.
- KI-006: promoção manual por SHA/artifact, auto-deploy desativado, Release Truth e smoke produtivo foram comprovados pelos runs `31760852798` e `31764192229`;
- KI-010: migration 0039, secret MFA e fluxo funcional completo foram comprovados remotamente; recovery extremo do owner permanece separado em KI-011.
- Wordle limitado a cinco letras/dicionário estreito: encerrado no código; aceita 5–7 letras, normaliza acentos e usa léxico PT-BR revisado mais respostas publicadas do CMS.
- importação universal sem orientação: encerrado no código; a Central de Conteúdo agora conduz upload/modelo, dry-run, relatório e confirmação.
