# Documentos jurídicos v2 — roteiro de revisão

**DRAFT — NÃO É ACONSELHAMENTO JURÍDICO NEM TEXTO APROVADO PARA RELEASE.**

As páginas `/privacidade` e `/termos` já contêm versões técnicas. Antes da abertura pública, um revisor humano deve produzir versões finais coerentes com este roteiro.

## Identificação obrigatória

- controlador/responsável legal: pessoa física responsável pelo projeto, **Lucas de Oliveira da Silva** (`RESOLVED` para a fase atual);
- CPF: não publicar;
- razão social/CNPJ: não aplicável à decisão atual; reavaliar se a estrutura jurídica mudar;
- endereço residencial: não publicar; necessidade de endereço físico: `HUMAN_REVIEW_REQUIRED`;
- canal institucional de suporte/privacidade: **suporteconteosfeitos@gmail.com** (`RESOLVED`);
- encarregado/DPO, se aplicável: `HUMAN_DECISION_REQUIRED`;
- data, versão e histórico de vigência: `HUMAN_DECISION_REQUIRED`.

O contato institucional aprovado substitui o e-mail pessoal nas superfícies jurídicas públicas. Nenhum endereço residencial está aprovado para publicação.

## Política de Privacidade — tópicos mínimos

- categorias e finalidades de `docs/PRIVACY_DATA_INVENTORY.md`;
- fundamentos legais definidos pelo revisor, sem inferência técnica;
- visibilidade de perfil/rankings e isolamento por organização;
- Cloudflare como runtime/D1/observabilidade e GitHub como código/CI/artifacts operacionais, sem presumir que recebem os mesmos dados;
- possível processamento internacional por fornecedores; localização, mecanismo/base legal e redação definitiva: `HUMAN_LEGAL_REVIEW_REQUIRED`;
- público-alvo formal da v2: `ADULTS_ONLY_18_PLUS`, com confirmação explícita e sem coleta de data de nascimento (`RESOLVED_PRODUCT_DECISION`);
- suficiência jurídica da autodeclaração e redação final: `HUMAN_LEGAL_REVIEW_REQUIRED`;
- suporte específico a crianças, contas infantis ou supervisionadas: `NOT_IMPLEMENTED` / `POST_RELEASE`;
- exportação, correção, pedido de exclusão, anonimização e dados preservados;
- retenção por categoria, backups e restauração;
- segurança, incidentes, contato e mudanças materiais.

## Termos de Uso — tópicos mínimos

- escopo dos sete jogos e modos;
- elegibilidade coerente com o público-alvo formal adolescente/adulto, sem inventar idade mínima jurídica ou verificação etária existente;
- regras contra fraude/automação e moderação;
- XP/moedas/itens sem valor monetário;
- conteúdo editorial, direitos, licenças e responsabilidade de editores;
- disponibilidade, alterações, suspensão, encerramento e limitações permitidas;
- lei/foro e identificação do prestador: `HUMAN_DECISION_REQUIRED`.

## Nota de conteúdo religioso/editorial

O produto contém jogos educacionais baseados em conteúdo bíblico. O texto final deve explicar que:

- referências e respostas passam por processo editorial, mas podem exigir correção;
- conteúdo não substitui orientação religiosa, educacional ou profissional;
- tradições e traduções podem divergir;
- o canal de correção editorial será `HUMAN_DECISION_REQUIRED`;
- traduções ou textos completos só serão distribuídos com licença documentada.

## Retenção — proposta para aprovação

Não é política jurídica vigente definitiva. A decisão técnica preliminar preserva conta/estado funcional enquanto necessários e mantém migrations, ledgers e registros essenciais à integridade, idempotência, segurança e reconstrução. Dados temporários elegíveis têm objetivo futuro de 30–90 dias; auditoria/detalhes elegíveis, de 12–18 meses. Esses intervalos não são promessa ao usuário e somente poderão ser implementados após revisão jurídica e análise por tabela.

A v2 não excluirá contas automaticamente por inatividade (`RESOLVED_PRODUCT_DECISION`). O pedido de exclusão existente permanece disponível. Política de inatividade, avisos e anonimização/exclusão automática são `POST_RELEASE` / `HUMAN_LEGAL_REVIEW_REQUIRED`.

## Classificação e público

No questionário de classificação, declarar com precisão: temática religiosa/bíblica, competição leve, economia virtual sem compra real, conteúdo de editores autorizados e ausência de chat público. A v2 adota `ADULTS_ONLY_18_PLUS`; o proprietário deve configurar a faixa correspondente nas regras vigentes e não aderir ao Families sem decisão jurídica explícita.
