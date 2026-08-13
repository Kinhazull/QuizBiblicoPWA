# Direção de arte dos colecionáveis — v2.0.0

**Estado:** pack PNG produzido e auditado; integração pendente e dois aliases de moldura aguardam confirmação  
**Fonte técnica:** `shared/platform-economy.ts` e `shared/platform-collections.ts`  
**Regra:** IDs, preços, raridades, origens e grants abaixo são contratos estáveis.

## Inventário dos avatares

| ID | Nome e descrição atuais | Placeholder | Raridade | Origem/requisito | Preço | Estado inicial | Conceito visual sugerido |
|---|---|---:|---|---|---:|---|---|
| `avatar-scroll` | Avatar Pergaminho — estudo e sabedoria | 📜 | COMMON | SHOP | 90 | não adquirido | pergaminho aberto, bordas enroladas, poucas linhas abstratas e pequeno marcador azul |
| `avatar-dove` | Avatar Pomba — paz e esperança | 🕊️ | UNCOMMON | SHOP | 160 | não adquirido | pomba branca em voo frontal suave, ramo discreto e halo azul-claro não religioso-genérico |
| `avatar-lion` | Avatar Leão — coragem e força | 🦁 | RARE | SHOP | 240 | não adquirido | leão sereno em três quartos, juba geométrica dourada, expressão acolhedora e firme |
| `avatar-lamp` | Avatar Lâmpada — a Palavra ilumina o caminho | 🪔 | COMMON | DAILY, `daily_challenge_7`; concluir 7/7 desafios do dia | não comprável (preço catalogado 70, sem exposição na Loja) | não adquirido | lâmpada de barro acesa, chama azul-dourada, brilho legível sem depender de efeito externo |
| `avatar-fish` | Avatar Peixe — símbolo histórico da fé cristã | 🐟 | UNCOMMON | SHOP | 110 | não adquirido | peixe estilizado em movimento, construído por curvas próprias, sem copiar marcas ou ícones de terceiros |
| `avatar-olive` | Avatar Oliveira — paz, aliança e perseverança | 🫒 | UNCOMMON | SHOP | 130 | não adquirido | pequeno ramo de oliveira com folhas largas e duas azeitonas, silhueta forte |
| `avatar-ark` | Avatar Arca — cuidado e preservação | 🚢 | RARE | SHOP | 190 | não adquirido | arca de madeira vista em três quartos, forma simples e reconhecível, água reduzida a duas curvas |
| `avatar-crown` | Avatar Coroa — Reino e esperança eterna | 👑 | EPIC | SHOP | 250 | não adquirido | coroa sóbria de três pontas, ouro fosco, detalhe azul; evitar aparência monárquica excessivamente luxuosa |

## Inventário das molduras

| ID | Nome e descrição atuais | Placeholder | Raridade | Origem/requisito | Preço | Estado inicial | Conceito visual sugerido |
|---|---|---:|---|---|---:|---|---|
| `frame-bronze` | Moldura Bronze — acabamento clássico | 🥉 | COMMON | SHOP | 60 | não adquirida | aro duplo bronze escovado, quatro marcas discretas de progressão |
| `frame-silver` | Moldura Prata — acabamento brilhante | 🥈 | UNCOMMON | SHOP | 140 | não adquirida | aro prateado frio, facetas simples e dois pontos de luz fixos |
| `frame-gold` | Moldura Ouro — grandes conquistas | 🥇 | EPIC | SHOP | 260 | não adquirida | aro dourado espesso com relevo radial contido, leitura premium sem excesso de ornamentos |
| `frame-olive` | Moldura Oliveira — paz e perseverança | 🫒 | COMMON | SHOP | 90 | não adquirida | aro verde profundo com dois pequenos ramos opostos, centro totalmente livre |
| `frame-covenant` | Moldura Aliança — promessa e fidelidade | 🌈 | UNCOMMON | SHOP | 120 | não adquirida | aro azul-violeta com arco cromático curto na parte superior, sem ocupar o rosto |
| `frame-light` | Moldura Luz — esperança | ✨ | RARE | ACHIEVEMENT, `first_steps` | não comprável (preço catalogado 180, sem exposição na Loja) | não adquirida | aro marfim-dourado com quatro raios curtos; brilho embutido na arte e legível sem animação |
| `frame-royal` | Moldura Real — púrpura e ouro | 🟣 | RARE | SHOP | 220 | não adquirida | aro púrpura profundo com filete dourado e pequenas formas de escudo abstratas |
| `frame-celestial` | Moldura Celestial — azul e estrelas | 🌟 | EPIC | SHOP | 250 | não adquirida | aro azul-noturno com pontos estelares assimétricos e leve transição para ciano |

Sem item equipado, `EquippedAvatar` apresenta a inicial do nome sobre o avatar padrão azul. Não há grant inicial automático nem collectible padrão persistido.

## Dependências técnicas dos IDs

- `SHOP_CATALOG` é a definição canônica de ID, categoria, nome, descrição, preço e placeholder.
- `COLLECTIBLE_CATALOG` acrescenta coleção, raridade, origem e `originRef`.
- `COLLECTIBLE_GRANTS.dailyChallenge7` depende exatamente de `avatar-lamp`.
- `COLLECTIBLE_GRANTS.achievements.first_steps` depende exatamente de `frame-light`.
- Loja, Inventário e Coleções retornam os IDs pelas APIs `/api/platform/shop`, `/api/platform/inventory` e `/api/platform/collections`.
- equipamento é persistido no ledger com `source_type='shop_equipment'` e `source_id=<itemId>`; propriedade usa compra ou `collectible_grant`.
- Ranking transporta `avatarId` e `frameId`; Home, Perfil e Ranking resolvem os IDs contra o catálogo compartilhado.
- Usuários históricos podem possuir ou equipar qualquer ID estável. A futura mudança deve adicionar localização visual, nunca trocar o ID.

## Onde os placeholders aparecem

1. Loja: card de cada um dos 14 itens `origin=SHOP`, atualmente em caixa de 105 px (88 px no mobile), emoji a 62 px.
2. Inventário: cards dos itens possuídos, reutilizando o mesmo estilo da Loja.
3. Coleções/Recompensas: grade dos 16 itens, emoji a 29 px; capa das duas coleções também é emoji.
4. Home e Perfil: `EquippedAvatar`, 68×68 ou 90×90; Home reduz para aproximadamente 50–58 px nos menores viewports.
5. Ranking: `EquippedAvatar` forçado para 48×48 px, com 46 px disponíveis na grade móvel.
6. Respostas das APIs citadas: o campo `icon` ainda carrega o emoji e é consumido pelo cliente.

## Especificação técnica dos avatares

- Formato master recebido: PNG local transparente, normalmente 1254×1254. Preservar os masters; gerar derivados responsivos WebP/AVIF apenas durante integração, sem conversão nesta auditoria.
- Proporção: 1:1; `viewBox="0 0 256 256"`; fonte de criação recomendada em 1024×1024 quando raster.
- Fundo: transparente. A silhueta principal deve ocupar 72–78% da área, mantendo safe area externa mínima de 12%.
- Evitar texto, detalhes abaixo de 3% da largura, sombras externas cortáveis e elementos dependentes de animação.
- Validar em 90, 68, 58, 50 e 48 px; o significado deve continuar reconhecível em 32 px para expansão futura.
- Contraste mínimo contra fundos azul-escuro e azul médio atuais. Contorno interno claro/escuro deve pertencer à própria arte.
- No Perfil e Home, o avatar fica centralizado dentro da moldura circular; no Ranking, detalhes periféricos serão perdidos primeiro.

## Especificação técnica das molduras

- Formato recomendado: SVG local 1:1, `viewBox="0 0 256 256"`, transparente.
- Arte deve formar um aro circular. Zona central totalmente transparente: diâmetro mínimo de 72% (184 px no viewBox 256).
- Safe area externa: 5% (13 px); nenhum brilho essencial pode ultrapassá-la.
- Espessura visual principal: 8–12% do diâmetro. Ornamentos podem chegar a 15%, mas não invadir o centro.
- Moldura e avatar devem ser camadas independentes; a moldura fica acima, sem bloquear rosto/símbolo.
- Validar em 90, 68, 58, 50 e 48 px. Raridade não pode depender apenas de cor: usar espessura, faceta ou marca estrutural distinta.
- Animação não é requisito da v2; brilho, luz e estrelas precisam funcionar estaticamente e com redução de movimento.

## Direção artística comum

Estilo proposto: ilustração vetorial semiplana, formas arredondadas e geométricas, volume moderado por dois tons, contorno consistente e acabamento próprio da identidade azul, verde e dourada do Conte os Feitos. O conjunto deve ser acolhedor para adolescentes e adultos, legível em celular e claramente colecionável sem parecer infantil.

Raridades usam uma gramática combinada:

- COMMON: forma simples, um material, pouco relevo;
- UNCOMMON: segundo tom e um detalhe secundário;
- RARE: facetas/ornamento e contraste mais forte;
- EPIC: composição mais rica e assinatura luminosa estática, sem excesso visual.

Símbolos devem partir de objetos, natureza e narrativas bíblicas, evitando cruzes genéricas repetidas, iconografia denominacional, personagens reconhecíveis de obras de terceiros, marcas, texto e brasões existentes.

## Estratégia de assets locais

Estrutura proposta para implementação futura:

```text
public/collectibles/v1/avatars/<id>.svg
public/collectibles/v1/frames/<id>.svg
public/collectibles/v1/fallback/avatar-default.svg
docs/PRODUCT/COLLECTIBLES_ASSET_PROVENANCE.json
```

O catálogo deverá futuramente acrescentar `assetPath` opcional sem remover `icon`. A UI tenta o asset local e mantém o `icon` como fallback durante a transição. Assets em `public/` funcionam com a CSP atual (`img-src 'self'`) e não exigem CDN, domínio ou custo adicional.

## Estratégia de fallback

- asset ausente ou com erro: voltar ao emoji atual do mesmo item;
- item histórico reconhecido pelo catálogo: manter nome, propriedade e equipamento, usando asset ou emoji;
- ID histórico desconhecido: não falhar a página; mostrar inicial do usuário para avatar e moldura neutra para frame, preservando o ID apenas no estado técnico;
- item sem arte aprovada: continuar com emoji e badge “arte provisória” somente em superfícies administrativas, não degradar a experiência do participante;
- falha de moldura nunca deve ocultar o avatar; falha do avatar nunca deve remover nome, nível ou posição no ranking;
- `alt`/`aria-label` usa nome do item, não filename. Imagens decorativas dentro de `EquippedAvatar` permanecem ocultas porque o contêiner já fornece o nome acessível.

## Registro de proveniência e licença

Cada asset futuro deve possuir registro antes de receber status de aprovação:

```json
{
  "id": "avatar-scroll",
  "file": "public/collectibles/v1/avatars/avatar-scroll.svg",
  "origin": null,
  "authorOrProducer": null,
  "creationMethod": null,
  "license": null,
  "status": "PENDING_HUMAN_REVIEW",
  "approvedAt": null,
  "approvedBy": null,
  "sourceEvidence": null,
  "sha256": null
}
```

Estados mínimos: `DRAFT`, `PENDING_HUMAN_REVIEW`, `APPROVED_INTERNAL`, `LICENSE_DOCUMENTED`, `REJECTED`. A proveniência e o estado observado estão em `COLLECTIBLES_ASSET_PROVENANCE.json`; integração no runtime não equivale a aprovação automática de aliases.

## Critérios para substituir os emojis

- os 16 IDs têm arquivo e registro de proveniência completos;
- aprovação humana visual e de licença registrada;
- validação em todos os tamanhos reais e em 320 px de viewport;
- teste de fallback e de IDs históricos;
- nenhum ajuste de preço, raridade, grant, Daily, conquista ou economia;
- atualização conjunta de Loja, Inventário, Coleções, Home, Perfil e Ranking.
