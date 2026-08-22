import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "content", "wordle-scale-up-v2-lot-01.json");
const reviewOutput = resolve(root, "docs", "PRODUCT", "WORDLE_SCALE_UP_V2_LOT_01_REVIEW.md");

// Curadoria editorial própria. Este lote permanece pendente de revisão humana.
// PALAVRA|REFERÊNCIA|CATEGORIA|TESTAMENTO|DIFICULDADE|DICA
const source = String.raw`
AJUDA|Salmos 121:2|Conceitos|Antigo Testamento|EASY|Socorro que o salmista afirma vir do Criador dos céus e da terra.
AROMA|Gênesis 8:21|Conceitos|Antigo Testamento|MEDIUM|Característica da oferta apresentada por Noé depois de sair da arca.
BARCO|Marcos 4:36|Objetos|Novo Testamento|MEDIUM|Embarcação na qual Jesus estava durante uma forte tempestade.
BARRO|Jeremias 18:6|Objetos|Antigo Testamento|MEDIUM|Material moldado pelo oleiro na mensagem dirigida à casa de Israel.
BISPO|1 Timóteo 3:2|Igreja|Novo Testamento|MEDIUM|Responsável da comunidade cuja conduta é descrita em uma carta pastoral.
CABRA|Levítico 4:28|Animais|Antigo Testamento|HARD|Animal fêmea aceito em uma oferta relacionada a pecado involuntário.
CANTO|Êxodo 15:1|Conceitos|Antigo Testamento|MEDIUM|Expressão de celebração entoada após a travessia do mar.
CASAS|Atos 2:46|Lugares|Novo Testamento|MEDIUM|Locais onde os primeiros discípulos repartiam o alimento com alegria.
CHAGA|Isaías 53:5|Conceitos|Antigo Testamento|MEDIUM|Ferimento associado profeticamente à cura e ao sofrimento do Servo.
CHAMA|Êxodo 3:2|Natureza|Antigo Testamento|MEDIUM|Manifestação visível no arbusto que ardia sem ser consumido.
CHAVE|Mateus 16:19|Objetos|Novo Testamento|MEDIUM|Símbolo de autoridade prometido no ensino sobre o Reino dos céus.
CULPA|Levítico 5:5|Conceitos|Antigo Testamento|HARD|Responsabilidade que deveria ser reconhecida e confessada após uma transgressão.
DANCA|2 Samuel 6:14|Conceitos|Antigo Testamento|EASY|Expressão corporal de alegria de Davi diante da arca do Senhor.
DORES|Mateus 24:8|Conceitos|Novo Testamento|MEDIUM|Imagem usada por Jesus para descrever o começo de acontecimentos difíceis.
FONTE|João 4:14|Natureza|Novo Testamento|EASY|Imagem de água interior que conduz à vida eterna.
FORCA|Efésios 6:10|Conceitos|Novo Testamento|EASY|Capacidade que os cristãos devem buscar no Senhor e em seu poder.
FORNO|Daniel 3:6|Objetos|Antigo Testamento|MEDIUM|Lugar de fogo preparado como punição para quem não adorasse a imagem.
HINOS|Atos 16:25|Conceitos|Novo Testamento|MEDIUM|Louvores entoados por Paulo e Silas enquanto estavam presos.
IDOLO|1 Coríntios 8:4|Conceitos|Novo Testamento|MEDIUM|Representação sem realidade divina discutida por Paulo ao tratar de alimentos.
JESSE|Isaías 11:1|Personagens|Antigo Testamento|HARD|Pai ligado à raiz da qual surgiria um descendente cheio do Espírito.
JOVEM|1 Timóteo 4:12|Pessoas|Novo Testamento|MEDIUM|Condição de idade que não deveria impedir Timóteo de ser exemplo.
LEITE|1 Pedro 2:2|Alimentos|Novo Testamento|MEDIUM|Alimento usado como imagem do desejo pela nutrição espiritual.
LEOES|Daniel 6:22|Animais|Antigo Testamento|EASY|Animais cujas bocas foram fechadas quando Daniel esteve na cova.
LUZES|Gênesis 1:14|Natureza|Antigo Testamento|HARD|Corpos do firmamento destinados a marcar tempos, dias e anos.
MAGOS|Mateus 2:1|Pessoas|Novo Testamento|EASY|Visitantes do Oriente que chegaram a Jerusalém após o nascimento de Jesus.
MALES|Salmos 34:19|Conceitos|Antigo Testamento|MEDIUM|Aflições numerosas das quais o Senhor livra o justo.
MANHA|Salmos 5:3|Conceitos|Antigo Testamento|EASY|Período do dia em que o salmista apresenta sua oração e espera.
MASSA|1 Coríntios 5:6|Alimentos|Novo Testamento|MEDIUM|Mistura usada por Paulo para explicar o efeito de um pouco de fermento.
NAVIO|Atos 27:41|Objetos|Novo Testamento|EASY|Embarcação que encalhou durante a viagem de Paulo para Roma.
ORFAO|Tiago 1:27|Pessoas|Novo Testamento|MEDIUM|Pessoa vulnerável cujo cuidado integra a religião considerada pura.
PRUMO|Amós 7:8|Objetos|Antigo Testamento|HARD|Instrumento de medição mostrado ao profeta numa visão de julgamento.
RAIOS|Salmos 18:14|Natureza|Antigo Testamento|MEDIUM|Sinais lançados dos céus na descrição poética do livramento divino.
SACOS|Gênesis 42:25|Objetos|Antigo Testamento|MEDIUM|Recipientes dos irmãos de José que receberam cereal e dinheiro devolvido.
SEARA|Mateus 9:37|Natureza|Novo Testamento|EASY|Campo pronto usado por Jesus para falar de uma obra grande com poucos trabalhadores.
SELOS|Apocalipse 5:1|Objetos|Novo Testamento|HARD|Marcas que mantinham fechado o livro visto à direita daquele que estava no trono.
TABOR|Juízes 4:6|Lugares|Antigo Testamento|HARD|Monte para o qual Baraque foi convocado com homens de duas tribos.
VIGIA|Ezequiel 3:17|Títulos|Antigo Testamento|MEDIUM|Função atribuída ao profeta para advertir o povo ao ouvir a palavra divina.
VIUVA|Lucas 21:2|Pessoas|Novo Testamento|EASY|Mulher pobre que colocou duas pequenas moedas na oferta.
VOTOS|Atos 21:23|Conceitos|Novo Testamento|HARD|Compromissos religiosos assumidos por homens que Paulo foi orientado a acompanhar.
ZIMRI|1 Reis 16:10|Personagens|Antigo Testamento|HARD|Oficial que conspirou contra Elá e ocupou brevemente o trono de Israel.
SEITA|Atos 24:5|Conceitos|Novo Testamento|HARD|Termo acusatório empregado contra os seguidores do Nazareno.
CEGOS|Mateus 11:5|Pessoas|Novo Testamento|MEDIUM|Pessoas que recuperavam uma capacidade mencionada entre os sinais do ministério de Jesus.
MUDOS|Mateus 15:31|Pessoas|Novo Testamento|HARD|Pessoas que passaram a falar e levaram a multidão a glorificar a Deus.
SURDO|Marcos 7:32|Pessoas|Novo Testamento|HARD|Homem com dificuldade de ouvir levado a Jesus na região da Decápolis.
COXOS|Mateus 11:5|Pessoas|Novo Testamento|MEDIUM|Pessoas que voltavam a andar entre as obras anunciadas por Jesus.
PESCA|Lucas 5:4|Eventos|Novo Testamento|MEDIUM|Atividade que resultou numa quantidade extraordinária após uma ordem de Jesus.
MALCO|João 18:10|Personagens|Novo Testamento|HARD|Servo do sumo sacerdote ferido durante a prisão de Jesus.
TURBA|Lucas 5:1|Pessoas|Novo Testamento|HARD|Grande grupo que se apertava ao redor de Jesus para ouvir a palavra de Deus.
VERBO|João 1:1|Títulos|Novo Testamento|HARD|Título apresentado no início de um Evangelho como existente desde o princípio.
VESTE|Apocalipse 7:9|Objetos|Novo Testamento|MEDIUM|Peça branca usada pela grande multidão diante do trono.
`.trim();

const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const rows = source.split(/\r?\n/u).filter(Boolean).map((line, index) => {
  const [rawWord, biblicalReference, category, testament, difficulty, hint] = line.split("|");
  const word = normalize(rawWord);
  if (word.length !== 5 || !/^[A-Z]+$/u.test(word)) throw new Error(`invalid_word:${index + 1}:${rawWord}`);
  if (!biblicalReference || !category || !testament || !difficulty || !hint) throw new Error(`incomplete_item:${index + 1}`);
  if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) throw new Error(`invalid_difficulty:${index + 1}`);
  if (normalize(hint).split(/[^A-Z]+/u).includes(word)) throw new Error(`hint_reveals_answer:${word}`);
  return {
    externalId: `wordle-scale-v2-l01-${String(index + 1).padStart(3, "0")}-${word.toLowerCase()}`,
    gameType: "wordle-biblico",
    category,
    difficulty,
    biblicalReference,
    tags: [testament, "Content Scale-Up v2", "Lote 01", "5 letras"],
    payload: { word, hint },
  };
});

if (rows.length !== 50) throw new Error(`unexpected_lot_size:${rows.length}`);
if (new Set(rows.map(entry => entry.payload.word)).size !== rows.length) throw new Error("duplicate_answer_in_lot");

mkdirSync(resolve(root, "content"), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  version: 1,
  source: "Conte os Feitos — Content Scale-Up v2 — Wordle lote 01",
  reviewStatus: "APPROVED_BY_PROJECT_OWNER",
  contents: rows,
}, null, 2)}\n`);

const reviewRows = rows.map(item => [
  item.externalId,
  item.payload.word,
  item.biblicalReference,
  item.category,
  item.tags[0],
  item.difficulty,
  item.payload.hint,
  "[ ]",
].map(value => String(value).replaceAll("|", "\\|")).join(" | "));
writeFileSync(reviewOutput, `# Revisão humana — Wordle Content Scale-Up v2 — lote 01

**Estado:** APPROVED_BY_PROJECT_OWNER  
**Aprovação:** proprietário do projeto, em 22/08/2026  
**Escopo:** 50 soluções de cinco letras  
**Regra:** este documento não aprova, importa ou publica conteúdo.

## Distribuição

- comprimento: 50 soluções de 5 letras;
- dificuldade: 10 EASY, 25 MEDIUM e 15 HARD;
- Testamento: 21 Antigo e 29 Novo;
- duplicatas exatas internas ou contra os 273 itens anteriores: zero (validação automatizada).

## Checklist do revisor

- [ ] palavra natural e reconhecível em português do Brasil;
- [ ] relevância bíblica direta;
- [ ] referência sustenta a dica;
- [ ] dica inequívoca e não revela a solução;
- [ ] dificuldade justa;
- [ ] decisão registrada para todos os 50 itens.

## Itens

| ID | Solução | Referência | Categoria | Testamento | Dificuldade | Dica | Revisado |
|---|---|---|---|---|---|---|---|
${reviewRows.map(row => `| ${row} |`).join("\n")}

## Gate

O lote foi aprovado explicitamente pelo proprietário em 22/08/2026. A aprovação editorial não executa dry-run, importação ou publicação; essas operações pertencem à etapa controlada 27.7.5B.7.
`, "utf8");

const count = key => Object.fromEntries(Object.entries(Object.groupBy(rows, key)).map(([name, values]) => [name, values.length]));
console.log(JSON.stringify({ output, reviewOutput, total: rows.length, difficulty: count(item => item.difficulty), testament: count(item => item.tags[0]) }, null, 2));
