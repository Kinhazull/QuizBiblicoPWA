# Preparação para Google Play

## Recomendação

Para o produto atual, a evolução de menor risco é: PWA instalada pelo navegador primeiro e **Trusted Web Activity (TWA)** quando domínio e operação pública estiverem estabilizados. Não há requisito nativo confirmado que justifique wrapper híbrido agora.

## Alternativas

- PWA: distribuição imediata pela Web, uma base de código; descoberta limitada na loja.
- TWA: presença na Play Store e UI Web em tela cheia; exige PWA confiável, HTTPS e associação domínio/aplicativo.
- Wrapper híbrido: acesso futuro a APIs nativas, porém acrescenta runtime, revisão, segurança e ciclo de releases duplicado.

## Pré-requisitos TWA

- domínio HTTPS estável e controlado;
- manifest e service worker aprovados em Android real;
- package ID, keystore e assinatura protegidos;
- `assetlinks.json` com fingerprint da assinatura;
- conta Play Console e identidade jurídica;
- política de privacidade pública e ficha Data Safety revisada;
- screenshots, ícones, classificação indicativa e políticas da loja;
- estratégia de atualização, rollout, rollback e suporte.

## Package ID

Proposta reservada: `br.com.conteosfeitos.app`. **DECISÃO DO DONO** antes de publicação, condicionada ao domínio e à organização jurídica. Não foi fixada em configuração nem usada para assinatura.
