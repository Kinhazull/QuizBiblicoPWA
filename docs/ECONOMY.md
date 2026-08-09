# Economia da Plataforma v2

## Objetivo e fonte da verdade

Este documento registra a política econômica vigente da plataforma. Os valores executáveis compartilhados ficam em `shared/platform-economy.ts`; Progress e seus ledgers continuam sendo a única fronteira de escrita de XP e moedas.

## Princípios

- recompensas recorrentes devem ser perceptíveis sem esgotar imediatamente o catálogo permanente;
- valores são calculados ou resolvidos no servidor, nunca aceitos do cliente;
- toda concessão e todo gasto usam identificadores determinísticos e são idempotentes;
- XP, nível e moedas não são duplicados em Statistics;
- cosméticos são permanentes e não concedem vantagem competitiva;
- mudanças futuras devem preservar compatibilidade prospectiva: ledgers históricos não são recalculados.

## Fontes de XP e moedas

| Fonte | Frequência | XP | Moedas | Observação |
|---|---:|---:|---:|---|
| Partida oficial | por conclusão | 20 + 0–20 por desempenho + 10 perfeita | 1 + 1 com 70% + 1 perfeita | máximo 50 XP e 3 moedas por partida |
| Primeira partida oficial UTC | uma por dia | +10 | 0 | mantém o contrato histórico do Reward Consumer |
| Login diário | uma por dia local | 10–22 | 2–5 | cresce com streak de 1 a 7 dias |
| Desafio 3/7 | uma por dia local | 30 | 5 | claim manual após três vitórias distintas |
| Desafio 7/7 | uma por dia local | 70 | 12 | adicional ao 3/7 e claramente superior |
| Missão | conforme catálogo | 15–180 nos ciclos diário/semanal | 3–36 | claim pelo Mission Service |
| Cofre diário | uma abertura elegível | 0–20 | 0–5 | variantes determinísticas existentes |
| Conquista | uma por conquista | 50–600 | 10–120 | desbloqueio único conforme catálogo |
| Evento | configuração administrativa | até 250 | até 50 | limites server-side atuais; requer orçamento editorial |

## Sumidouros de moedas

O sumidouro atual é a Loja de cosméticos permanentes. Compra duplicada é recusada, o preço vem exclusivamente do catálogo server-side e equipar/trocar itens não consome moedas.

| Item | Preço anterior | Preço v2 |
|---|---:|---:|
| Moldura Bronze | 20 | 60 |
| Moldura Prata | 40 | 140 |
| Moldura Ouro | 70 | 260 |
| Avatar Pergaminho | 30 | 90 |
| Avatar Pomba | 45 | 160 |
| Avatar Leão | 60 | 240 |

O catálogo completo passou de 265 para 950 moedas. Não existem consumíveis, pagamentos ou saldo negativo.

## Modelagem de aquisição

As estimativas abaixo são cenários, não promessas de recompensa:

- casual: login e uma partida moderada por dia, aproximadamente 392 XP e 37 moedas por semana;
- regular: login, três partidas, meta 3/7, missão fácil e cofre médio por dia, aproximadamente 1.323 XP e 161 moedas por semana;
- muito engajado: sete partidas perfeitas, metas 3/7 e 7/7, missão difícil e cofre médio por dia, aproximadamente 3.682 XP e 364 moedas por semana.

Tempo aproximado por faixa de preço:

- casual: 11–17 dias para itens de entrada, 26–30 dias para intermediários e 45–49 dias para premium;
- regular: 3–4 dias, 6–7 dias e 11–12 dias, respectivamente;
- muito engajado: 1–2 dias, cerca de 3 dias e cerca de 5 dias; catálogo completo em aproximadamente 2,6 semanas.

## Segurança, idempotência e compatibilidade

- endpoints recebem ações e identificadores, não valores arbitrários de recompensa;
- preço, elegibilidade, status e recompensas são revalidados no servidor;
- isolamento usa `organizationId` e `userId` da sessão/evento confiável;
- Progress aplica XP/moedas com `DB.batch`, ledgers e `ON CONFLICT`;
- replay, múltiplas abas e concorrência não duplicam efeitos;
- saldos e ledgers existentes são preservados; os novos valores valem apenas para fatos futuros;
- nenhuma migration é necessária para esta política.

## Analytics e operação

Os Analytics existentes já expõem XP concedido, moedas concedidas/gastas, saldo agregado, compras, origens de recompensa e itens mais adquiridos. Após a ativação, devem ser observados semanalmente: emissão por origem, gasto, saldo mediano, tempo até primeira compra e concentração por item.

## Riscos e decisões pendentes

- Free Play continua sem teto diário de recompensas. O aumento de preços reduz o impacto, mas um orçamento diário server-side deve ser decidido com dados reais antes de ampliar o catálogo ou criar itens consumíveis.
- Eventos possuem limites técnicos amplos. Cada evento deve ter orçamento explícito; alterar os limites globais exige decisão de produto e compatibilidade com eventos já configurados.
- O catálogo atual é finito e permanente. Usuários muito engajados ainda podem concluí-lo em poucas semanas; novos sumidouros ou expansão cosmética devem ser orientados por Analytics, sem inflação preventiva.
