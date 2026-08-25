# Backlog corrente

**Status:** CURRENT. Itens concluídos de Daily, Economia 2.0, Coleções, Perfil 2.0, Ranking Universal, Biblioteca Inteligente, Editor Visual de Eventos e Planejamento não permanecem aqui.

## Antes da release pública

- remover em limpeza posterior os assets antigos de app icon/favicon classificados como `REPLACED_NOT_REFERENCED`, após confirmar ausência de consumidores externos;
- avaliar `splash-brand.png` somente quando existir uma splash nativa/Store real, sem criar atraso artificial;

- registrar modelo/Android/navegador na próxima matriz de aparelhos; a validação funcional Android/PWA atual já foi aprovada;
- coletar FIELD/CrUX ou RUM de custo zero quando houver tráfego suficiente; não confundir LAB atual com percentil real;
- confirmar por teste de rede móvel que o retry de conclusão não duplica XP, moedas, estatísticas, missões ou conquistas;
- revisar o Wordle extra “Átila”, publicado/projetado mas inelegível por dica vazia; recomendação atual: despublicar, salvo decisão editorial documentada em contrário;
- concluir revisão jurídica/licenças, tratamento de adolescentes/acesso infantil incidental e Data Safety;
- reconciliar Asset Registry, hospedagem de assets e CSP;
- preencher o orçamento operacional versionado com quotas e consumo reais dos painéis;
- aprovar juridicamente os prazos da matriz preliminar e só então desenhar limpeza por domínio/tabela;
- medir por 30 dias o Cron de um minuto antes de decidir entre 1, 2 ou 5 minutos;
- executar rehash progressivo de senhas sem quebra de sessão;
- validar em aparelho real a nitidez/acessibilidade dos assets já integrados; Store continua etapa humana separada;
- executar `docs/PRODUCT/CONTENT_HUMAN_REVIEW_CHECKLIST.md` e registrar evidência da revisão do Quiz/base oficial;
- revisar humanamente citações específicas do acervo; autoria interna das 984 perguntas foi declarada, e `bible-acf.json`/`bible-almeida.json` foram retirados da árvore ativa;
- decidir juridicamente se os blobs históricos dos textos integrais exigem purge dedicado e se ACF/Almeida poderão ter uso futuro;
- preservar os aliases aprovados `frame-covenant`→`frame-aliance` e `frame-royal`→`frame-real`; emojis seguem somente como fallback;
- revisar todos os assets `ACTIVE` e hosts do Asset Registry contra o manifesto de proveniência e a CSP.
- confirmar eventual identidade/endereço necessários e aprovar bases/prazos legais, tratamento de adolescentes/acesso infantil incidental e mecanismo de transferência internacional; controlador, contato, público-alvo, ausência de exclusão por inatividade e matriz técnica preliminar já estão definidos;
- revisar/publicar Termos, Privacidade e nota editorial v2 com versionamento e novo consentimento quando necessário;
- decidir domínio HTTPS e package ID; somente depois preparar assinatura, Digital Asset Links e AAB em faixa interna;
- preencher Data Safety e classificação indicativa com revisão humana usando as matrizes técnicas, nunca por cópia automática.
- criar inventário determinístico/SBOM de licenças e validar os avisos efetivamente distribuídos;
- decidir e, se aprovado juridicamente, publicar URL pública de solicitação/instruções de exclusão para o Google Play;
- reconciliar manifests históricos de assets com a proveniência v2 vigente;
- decidir purge histórico dos textos bíblicos removidos e política para traduções futuras;

## Evolução controlada

- retirar legado com inventário, telemetria, janela de compatibilidade e rollback;
- ampliar e revisar continuamente o conteúdo editorial;
- aprofundar Analytics 2.0 e depois Automação Administrativa;
- expandir colecionáveis e economia somente após dados reais de equilíbrio;
- manter hardening de segurança, performance e acessibilidade.
- `POST_RELEASE`: contas infantis e supervisionadas, com faixas etárias, consentimento/vínculo responsável, privacidade, minimização, gestão/exclusão, UX, revisão LGPD/ECA Digital, políticas Play/Families e testes próprios.
- `POST_RELEASE`: automação de retenção e contas inativas, incluindo prazo, aviso prévio, dependências por tabela, agregação e descarte, anonimização/exclusão e revisão jurídica.

## Pós-release

- avaliar heartbeat persistido, monitor externo e canal proativo de alerta com solução compatível com custo zero;
- atualizar Actions pinadas antes da remoção do runtime Node.js 20 pelos runners;
- executar, quando houver janela operacional segura, consumo single-use de recovery code e exercício extremo de recuperação do owner;
- retirar APIs históricas somente após telemetria, inventário de consumidores e rollback comprovado;
- mover/otimizar masters Store atualmente em `public/` após confirmar os consumidores e URLs necessárias;
- biblioteca bíblica e traduções somente com licença confirmada;
- manter e atualizar o léxico PT-BR aberto/aprovado com proveniência; qualquer fonte adicional exige licença compatível;
- expandir soluções Wordle futuras pelo CMS sem misturá-las ao dicionário de tentativas;
- evolução dos jogos atuais, novos jogos e possível pacote nativo/Google Play.
