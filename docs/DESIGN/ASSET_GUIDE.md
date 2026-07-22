# Guia de assets

## Fonte de verdade

Os arquivos gráficos de produto ficam em `assets/`. A pasta `public/` continua contendo apenas os arquivos efetivamente consumidos pela aplicação. Nesta etapa nenhum arquivo existente é movido ou substituído.

## Kit Oficial de Branding v001

Arquivos oficiais:

- `brand-identity-v001.png`
- `branding-kit-v001.png`

O Branding Kit define o uso oficial da identidade visual em:

- Logo
- App Icon
- Splash Screen
- Loading Screen
- Login
- Favicon
- Interface
- Plataformas
- Google Play
- PWA

Todas as novas implementações deverão seguir este documento.

## Ciclo de um asset

1. Guardar o original editável em `source/` quando aplicável.
2. Exportar uma versão candidata com nome descritivo.
3. Revisar legibilidade, contraste, dimensões, transparência e direitos de uso.
4. Colocar a versão aprovada em `approved/`.
5. Arquivar versões substituídas em `archived/` sem sobrescrever o histórico.
6. Copiar para `public/` somente em uma tarefa de implementação aprovada e testada.

## Nomenclatura

Usar letras minúsculas, hífens e finalidade explícita:

```text
conte-os-feitos-logo-horizontal-light.svg
conte-os-feitos-app-icon-512.png
quiz-biblico-hero-mobile.webp
```

Quando houver variação, indicar tema, orientação, tamanho ou densidade no nome. Evitar `final`, `final-2`, nomes pessoais e datas sem contexto.

## Formatos recomendados

- SVG para logos e ícones vetoriais;
- PNG quando transparência raster for necessária;
- WebP ou AVIF para ilustrações e imagens otimizadas;
- arquivos-fonte somente na área `source/`;
- screenshots em PNG ou WebP conforme a finalidade.

## Requisitos

- não incluir segredos ou dados pessoais em screenshots;
- documentar licença ou origem de material externo;
- remover metadados desnecessários antes da publicação;
- fornecer texto alternativo ou descrição de uso para conteúdo informativo;
- otimizar peso sem comprometer leitura;
- validar ícones PWA e favicons nos tamanhos exigidos antes de substituir os atuais.
