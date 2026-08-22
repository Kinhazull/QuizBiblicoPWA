import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "content", "wordle-expansion-v2.json");

// Curadoria editorial própria. Formato:
// PALAVRA|REFERÊNCIA|CATEGORIA|TESTAMENTO|DICA
const source = String.raw`
AARAO|Êxodo 28:1|Personagens|Antigo Testamento|Irmão de Moisés escolhido para servir como sumo sacerdote.
AMASA|2 Samuel 17:25|Personagens|Antigo Testamento|Comandante ligado à casa de Davi durante uma rebelião.
AMNON|2 Samuel 13:1|Personagens|Antigo Testamento|Filho de Davi envolvido em um episódio doloroso de sua família.
ANEIS|Gênesis 41:42|Objetos|Antigo Testamento|Símbolos usados para selar autoridade e decisões reais.
ANNAS|Lucas 3:2|Personagens|Novo Testamento|Líder sacerdotal mencionado junto de Caifás.
ARADO|Lucas 9:62|Objetos|Novo Testamento|Instrumento agrícola usado por Jesus em uma figura sobre perseverança.
ARIEL|Isaías 29:1|Lugares|Antigo Testamento|Nome simbólico empregado pelo profeta ao falar de Jerusalém.
AZAEL|2 Reis 8:13|Personagens|Antigo Testamento|Homem que se tornou rei da Síria após encontrar um profeta.
BODES|Levítico 16:5|Animais|Antigo Testamento|Animais presentes nos ritos do Dia da Expiação.
CALEB|Números 14:24|Personagens|Antigo Testamento|Espia que demonstrou confiança e recebeu uma herança em Canaã.
CESAR|Mateus 22:21|Personagens|Novo Testamento|Título imperial citado por Jesus em uma resposta sobre tributos.
CINZA|Jó 2:8|Objetos|Antigo Testamento|Elemento associado ao luto e à humilhação nas Escrituras.
DAGON|1 Samuel 5:2|Personagens|Antigo Testamento|Ídolo filisteu cujo templo recebeu a arca capturada.
ESTER|Ester 4:14|Personagens|Antigo Testamento|Rainha que arriscou a vida para interceder por seu povo.
GOSEN|Gênesis 47:6|Lugares|Antigo Testamento|Região do Egito onde a família de Jacó foi estabelecida.
HEBER|Gênesis 10:21|Personagens|Antigo Testamento|Descendente de Sem ligado à genealogia dos hebreus.
JORAO|2 Reis 3:1|Personagens|Antigo Testamento|Rei de Israel que buscou auxílio durante uma campanha militar.
LAMEC|Gênesis 5:28|Personagens|Antigo Testamento|Pai que deu ao filho um nome relacionado a descanso e consolo.
LIDIA|Atos 16:14|Personagens|Novo Testamento|Comerciante de púrpura que acolheu a mensagem em Filipos.
MICAL|1 Samuel 18:27|Personagens|Antigo Testamento|Filha de Saul que se tornou esposa de Davi.
MIRRA|Mateus 2:11|Objetos|Novo Testamento|Presente aromático oferecido ao menino Jesus pelos magos.
NAOMI|Rute 1:20|Personagens|Antigo Testamento|Sogra de Rute que retornou a Belém após grandes perdas.
OSIAS|2 Crônicas 26:1|Personagens|Antigo Testamento|Rei de Judá que prosperou enquanto buscou ao Senhor.
RAABE|Josué 2:1|Personagens|Antigo Testamento|Moradora de Jericó que protegeu os espias israelitas.
SADOC|2 Samuel 8:17|Personagens|Antigo Testamento|Sacerdote fiel durante os reinados de Davi e Salomão.
SALMO|Salmos 1:1|Livros|Antigo Testamento|Composição de louvor, oração ou sabedoria do livro poético bíblico.
TAMAR|Gênesis 38:6|Personagens|Antigo Testamento|Mulher presente na história da família de Judá.
TOCHA|Juízes 7:16|Objetos|Antigo Testamento|Fonte de luz escondida nos cântaros do pequeno exército de Gideão.
UZIAS|2 Crônicas 26:3|Personagens|Antigo Testamento|Rei de Judá conhecido por força militar e obras de defesa.
ZACAI|Lucas 19:2|Personagens|Novo Testamento|Cobrador de impostos que subiu em uma árvore para ver Jesus.
ZEBEU|Mateus 4:21|Personagens|Novo Testamento|Pai de dois pescadores chamados para seguir Jesus.
ARCAS|1 Samuel 6:8|Objetos|Antigo Testamento|Baús ou cofres; um exemplar sagrado representava a aliança.
BILHA|1 Reis 17:12|Objetos|Antigo Testamento|Recipiente doméstico ligado ao sustento da viúva de Sarepta.
BOTIM|Números 31:11|Conceitos|Antigo Testamento|Bens recolhidos após uma vitória militar.
CESTO|Mateus 14:20|Objetos|Novo Testamento|Recipiente usado para recolher o alimento que sobrou de um milagre.
COURO|Mateus 3:4|Objetos|Novo Testamento|Material mencionado na vestimenta de João Batista.
ERVAS|Gênesis 1:12|Natureza|Antigo Testamento|Vegetação que surgiu quando a terra produziu plantas.
HARPA|Salmos 33:2|Objetos|Antigo Testamento|Instrumento de cordas usado em louvor e celebração.
JARRO|Juízes 7:20|Objetos|Antigo Testamento|Recipiente quebrado pelos homens de Gideão durante o ataque.
LEPRA|Levítico 13:2|Conceitos|Antigo Testamento|Condição examinada pelos sacerdotes segundo a lei cerimonial.
OLIVA|Romanos 11:17|Natureza|Novo Testamento|Árvore usada por Paulo para explicar pertencimento e enxerto.
PALHA|Mateus 3:12|Natureza|Novo Testamento|Parte leve separada do trigo em uma imagem de julgamento.
POCOS|Gênesis 26:18|Lugares|Antigo Testamento|Fontes escavadas e disputadas na história de Isaque.
REDES|Mateus 4:20|Objetos|Novo Testamento|Ferramentas abandonadas por pescadores chamados para seguir Jesus.
SABAO|Malaquias 3:2|Objetos|Antigo Testamento|Produto de limpeza usado como figura de purificação.
TALHA|João 2:6|Objetos|Novo Testamento|Grande recipiente de pedra presente no casamento em Caná.
VARAS|Gênesis 30:37|Objetos|Antigo Testamento|Ramos utilizados por Jacó durante o cuidado dos rebanhos.
VIGAS|1 Reis 7:3|Objetos|Antigo Testamento|Peças estruturais empregadas em grandes construções.
CORDA|Josué 2:15|Objetos|Antigo Testamento|Meio usado para descer os espias pela janela em Jericó.
TRAVE|Mateus 7:3|Objetos|Novo Testamento|Objeto grande usado por Jesus para ensinar sobre julgamento hipócrita.

ABELHA|Juízes 14:8|Animais|Antigo Testamento|Inseto encontrado por Sansão dentro da carcaça de um leão.
ACACIA|Êxodo 25:10|Natureza|Antigo Testamento|Madeira prescrita para móveis e utensílios do tabernáculo.
AGRIPA|Atos 26:1|Personagens|Novo Testamento|Rei diante de quem Paulo apresentou sua defesa.
ANAQUE|Números 13:33|Personagens|Antigo Testamento|Nome associado a homens de grande estatura vistos em Canaã.
AZEITE|1 Reis 17:12|Alimentos|Antigo Testamento|Produto que não faltou na casa da viúva durante a fome.
BISPOS|Filipenses 1:1|Igreja|Novo Testamento|Líderes da comunidade cristã mencionados ao lado dos diáconos.
BORDAO|Êxodo 4:2|Objetos|Antigo Testamento|Objeto que Moisés segurava quando recebeu um sinal diante da sarça.
CADEIA|Atos 12:6|Objetos|Novo Testamento|Instrumento que prendia Pedro antes de sua libertação milagrosa.
CAMELO|Mateus 19:24|Animais|Novo Testamento|Animal usado por Jesus em uma comparação sobre riquezas.
CAMPOS|João 4:35|Lugares|Novo Testamento|Áreas de cultivo usadas como imagem da colheita espiritual.
CEDRON|João 18:1|Lugares|Novo Testamento|Ribeiro atravessado por Jesus antes de entrar no jardim.
CIDADE|Hebreus 11:10|Lugares|Novo Testamento|Lugar permanente aguardado por Abraão, cujo arquiteto é Deus.
CINZAS|Ester 4:1|Objetos|Antigo Testamento|Sinal público de lamento usado por Mordecai.
CRISTO|Mateus 16:16|Títulos|Novo Testamento|Título reconhecido por Pedro ao confessar quem Jesus é.
DEBORA|Juízes 4:4|Personagens|Antigo Testamento|Profetisa e juíza que liderou Israel com Baraque.
DRACMA|Lucas 15:8|Objetos|Novo Testamento|Moeda perdida e procurada cuidadosamente em uma parábola.
ELISEU|2 Reis 2:15|Personagens|Antigo Testamento|Profeta que recebeu o manto e sucedeu Elias.
ENOQUE|Gênesis 5:24|Personagens|Antigo Testamento|Homem que andou com Deus e não foi mais encontrado.
ESCUDO|Efésios 6:16|Objetos|Novo Testamento|Parte da armadura usada como figura para a fé.
ESPADA|Efésios 6:17|Objetos|Novo Testamento|Arma usada por Paulo como imagem da palavra de Deus.
ESPIGA|Gênesis 41:5|Natureza|Antigo Testamento|Elemento dos sonhos de Faraó interpretados por José.
ETIOPE|Atos 8:27|Personagens|Novo Testamento|Oficial que lia Isaías e foi orientado por Filipe.
GIDEAO|Juízes 7:7|Personagens|Antigo Testamento|Juiz que venceu um grande exército com apenas trezentos homens.
GOLIAS|1 Samuel 17:4|Personagens|Antigo Testamento|Guerreiro filisteu derrotado pelo jovem Davi.
HEBREU|Jonas 1:9|Povos|Antigo Testamento|Identidade declarada por Jonas aos marinheiros durante a tempestade.
IGREJA|Atos 2:47|Igreja|Novo Testamento|Comunidade de discípulos formada e fortalecida após Pentecostes.
ISAQUE|Gênesis 21:3|Personagens|Antigo Testamento|Filho da promessa nascido quando Abraão e Sara eram idosos.
ISAIAS|Isaías 6:8|Personagens|Antigo Testamento|Profeta que respondeu ao chamado após ver o Senhor no templo.
ISRAEL|Gênesis 32:28|Povos|Antigo Testamento|Nome recebido por Jacó e usado para identificar seus descendentes.
JERICO|Josué 6:20|Lugares|Antigo Testamento|Cidade cujos muros caíram após o povo seguir uma ordem divina.
JORDAO|Josué 3:17|Lugares|Antigo Testamento|Rio atravessado a seco por Israel na entrada de Canaã.
LEVITA|Lucas 10:32|Personagens|Novo Testamento|Servidor do templo citado na parábola do bom samaritano.
MIRIAM|Êxodo 15:20|Personagens|Antigo Testamento|Profetisa que celebrou com tamborins após a travessia do mar.
MOISES|Êxodo 3:10|Personagens|Antigo Testamento|Líder chamado na sarça para libertar Israel do Egito.
OVELHA|Lucas 15:4|Animais|Novo Testamento|Animal perdido e procurado pelo pastor em uma parábola.
PASTOR|Salmos 23:1|Conceitos|Antigo Testamento|Figura usada para descrever cuidado, direção e proteção.
PECADO|Romanos 3:23|Conceitos|Novo Testamento|Condição universal da humanidade tratada no evangelho.
PERDAO|Mateus 18:21|Conceitos|Novo Testamento|Tema da pergunta de Pedro sobre quantas vezes deveria relevar uma ofensa.
RAQUEL|Gênesis 29:18|Personagens|Antigo Testamento|Mulher por quem Jacó trabalhou durante muitos anos.
REBECA|Gênesis 24:67|Personagens|Antigo Testamento|Mulher que deixou sua família para se casar com Isaque.
ROMANO|Atos 22:25|Povos|Novo Testamento|Cidadania invocada por Paulo quando seria açoitado.
SABADO|Marcos 2:27|Conceitos|Novo Testamento|Dia sobre o qual Jesus ensinou que foi feito para o ser humano.
SAMUEL|1 Samuel 3:10|Personagens|Antigo Testamento|Menino que ouviu seu nome e aprendeu a responder ao chamado divino.
TEMPLO|1 Reis 6:1|Lugares|Antigo Testamento|Edifício construído por Salomão para o culto em Jerusalém.
TRIBOS|Gênesis 49:28|Povos|Antigo Testamento|Grandes grupos familiares originados dos filhos de Jacó.
UNGIDO|1 Samuel 16:13|Títulos|Antigo Testamento|Pessoa separada para uma missão mediante óleo e chamado.
CALICE|Mateus 26:27|Objetos|Novo Testamento|Recipiente compartilhado por Jesus durante a última ceia.
MANJAR|Daniel 1:8|Alimentos|Antigo Testamento|Comida real que Daniel decidiu não usar para se contaminar.
TUNICA|Gênesis 37:3|Objetos|Antigo Testamento|Roupa especial dada por Jacó a José.

ABSALAO|2 Samuel 15:10|Personagens|Antigo Testamento|Filho de Davi que promoveu uma rebelião contra o pai.
AMORREU|Josué 10:5|Povos|Antigo Testamento|Povo cananeu enfrentado por Israel durante a conquista.
ARARATE|Gênesis 8:4|Lugares|Antigo Testamento|Região montanhosa onde a arca repousou após o dilúvio.
BARAQUE|Juízes 4:6|Personagens|Antigo Testamento|Comandante convocado por Débora para enfrentar Sísera.
BARNABE|Atos 11:24|Personagens|Novo Testamento|Discípulo conhecido por encorajar outros e acompanhar missões.
BATALHA|1 Samuel 17:47|Conceitos|Antigo Testamento|Confronto no qual Davi declarou que a vitória pertence ao Senhor.
BEZERRA|Êxodo 32:4|Animais|Antigo Testamento|Forma do ídolo feito durante a permanência de Moisés no monte.
CARMELO|1 Reis 18:19|Lugares|Antigo Testamento|Monte onde Elias confrontou os profetas de Baal.
DAMASCO|Atos 9:3|Lugares|Novo Testamento|Cidade para a qual Saulo viajava quando encontrou uma luz do céu.
DESERTO|Êxodo 16:1|Lugares|Antigo Testamento|Região atravessada por Israel entre o Egito e a terra prometida.
EFESIOS|Efésios 1:1|Livros|Novo Testamento|Destinatários de uma carta sobre unidade, graça e vida cristã.
ESTRELA|Mateus 2:2|Natureza|Novo Testamento|Sinal celeste observado pelos magos no nascimento de Jesus.
FAMILIA|Gênesis 12:3|Conceitos|Antigo Testamento|Grupo humano incluído na promessa feita a Abraão.
GABRIEL|Lucas 1:26|Personagens|Novo Testamento|Mensageiro celestial enviado a Maria em Nazaré.
GALILEU|Atos 1:11|Povos|Novo Testamento|Identidade regional atribuída aos discípulos após a ascensão.
HERODES|Mateus 2:3|Personagens|Novo Testamento|Rei perturbado ao ouvir sobre o nascimento de outro governante.
LEPROSO|Marcos 1:40|Personagens|Novo Testamento|Homem que pediu purificação e foi tocado por Jesus.
MANASSE|Gênesis 41:51|Personagens|Antigo Testamento|Primeiro filho de José nascido no Egito.
NAZIREU|Números 6:2|Conceitos|Antigo Testamento|Pessoa consagrada por voto especial segundo a Lei.
PROFETA|Deuteronômio 18:18|Títulos|Antigo Testamento|Mensageiro levantado para transmitir a palavra de Deus ao povo.
VERDADE|João 14:6|Conceitos|Novo Testamento|Realidade que Jesus associou a si mesmo junto do caminho e da vida.
ALIANCA|Gênesis 9:13|Conceitos|Antigo Testamento|Compromisso confirmado por Deus com um sinal após o dilúvio.
CANDEIA|Mateus 5:15|Objetos|Novo Testamento|Fonte de luz que deve ser colocada em lugar visível.
INCENSO|Êxodo 30:8|Objetos|Antigo Testamento|Aroma queimado regularmente no altar do tabernáculo.
JOSAFAT|2 Crônicas 20:3|Personagens|Antigo Testamento|Rei que buscou ao Senhor diante de uma grande ameaça.
SALOMAO|1 Reis 3:12|Personagens|Antigo Testamento|Rei conhecido por sabedoria e pela construção do templo.
TIMOTEO|2 Timóteo 1:5|Personagens|Novo Testamento|Cooperador jovem cuja fé também marcou sua família.
BETANIA|João 11:1|Lugares|Novo Testamento|Povoado onde moravam Marta, Maria e Lázaro.
FARISEU|Lucas 18:10|Personagens|Novo Testamento|Integrante de um grupo religioso citado em uma parábola sobre oração.
LAMPADA|Salmos 119:105|Objetos|Antigo Testamento|Fonte de luz usada como imagem da palavra que orienta o caminho.
MILAGRE|João 2:11|Conceitos|Novo Testamento|Sinal extraordinário que manifestou a glória de Jesus em Caná.
APOSTOL|Marcos 3:14|Títulos|Novo Testamento|Enviado escolhido para acompanhar Jesus e anunciar a mensagem.
DILUVIO|Gênesis 7:17|Eventos|Antigo Testamento|Grande inundação da qual Noé e sua família foram preservados.
ESCRIBA|Esdras 7:6|Títulos|Antigo Testamento|Especialista na Lei associado ao ensino e à cópia dos textos.
EXILADO|Daniel 1:6|Pessoas|Antigo Testamento|Pessoa levada para viver longe de sua terra após uma conquista.
GOMORRA|Gênesis 19:24|Lugares|Antigo Testamento|Cidade destruída juntamente com Sodoma.
HUMILDE|Mateus 11:29|Conceitos|Novo Testamento|Qualidade de coração que Jesus atribuiu a si mesmo.
MAGDALA|Mateus 15:39|Lugares|Novo Testamento|Região próxima ao mar da Galileia mencionada nos Evangelhos.
MANJEDO|Lucas 2:7|Objetos|Novo Testamento|Lugar onde o menino Jesus foi deitado após nascer.
MURALHA|Josué 6:5|Objetos|Antigo Testamento|Estrutura defensiva que caiu em Jericó.
ORACULO|1 Reis 6:16|Lugares|Antigo Testamento|Parte interior e sagrada do templo de Salomão.
REBANHO|Salmos 77:20|Animais|Antigo Testamento|Grupo conduzido por um pastor, usado como imagem do povo.
SERAFIM|Isaías 6:2|Personagens|Antigo Testamento|Ser celestial visto pelo profeta ao redor do trono.
SOLDADO|2 Timóteo 2:3|Títulos|Novo Testamento|Figura usada por Paulo para ensinar dedicação e resistência.
TRIBUTO|Mateus 17:24|Conceitos|Novo Testamento|Pagamento questionado aos discípulos em Cafarnaum.
VIRTUDE|2 Pedro 1:5|Conceitos|Novo Testamento|Qualidade que deve ser acrescentada à fé no crescimento cristão.
PILATOS|Lucas 3:1|Personagens|Novo Testamento|Governador romano envolvido no julgamento de Jesus.
BATISMO|Romanos 6:4|Conceitos|Novo Testamento|Ato usado para representar união com a morte e ressurreição de Cristo.
PORTICO|João 10:23|Lugares|Novo Testamento|Área coberta do templo onde Jesus caminhou no inverno.
TABUAS|Êxodo 31:18|Objetos|Antigo Testamento|Peças de pedra que receberam os mandamentos da aliança.
TALENTO|Mateus 25:15|Conceitos|Novo Testamento|Unidade de valor confiada a servos em uma parábola.
CORNETA|Josué 6:20|Objetos|Antigo Testamento|Instrumento de sopro associado ao anúncio e à queda dos muros de Jericó.
COLUNAS|Juízes 16:29|Objetos|Antigo Testamento|Estruturas sobre as quais Sansão apoiou as mãos no templo filisteu.
CORINTO|Atos 18:1|Lugares|Novo Testamento|Cidade onde Paulo trabalhou e ensinou por longo período.
`.trim();

const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const rows = source.split(/\r?\n/).filter(Boolean).map((line, index) => {
  const [rawWord, biblicalReference, category, testament, hint] = line.split("|");
  const word = normalize(rawWord);
  if (![5, 6, 7].includes(word.length) || !/^[A-Z]+$/.test(word)) {
    throw new Error(`Invalid Wordle answer at source line ${index + 1}: ${rawWord} (${word.length})`);
  }
  if (!biblicalReference || !category || !testament || !hint) {
    throw new Error(`Incomplete Wordle metadata at source line ${index + 1}: ${rawWord}`);
  }
  const normalizedHintWords = normalize(hint).split(/[^A-Z]+/);
  if (normalizedHintWords.includes(word)) throw new Error(`Hint reveals answer: ${word}`);
  return {
    externalId: `wordle-v2-${String(index + 1).padStart(3, "0")}-${word.toLowerCase()}`,
    gameType: "wordle-biblico",
    category,
    difficulty: index % 5 === 4 ? "HARD" : index % 2 === 0 ? "EASY" : "MEDIUM",
    biblicalReference,
    tags: [testament, "Expansão Wordle v2", `${word.length} letras`],
    payload: { word, hint },
  };
});

const words = rows.map(entry => entry.payload.word);
if (new Set(words).size !== words.length) throw new Error("Duplicate answer in Wordle expansion v2.");

mkdirSync(resolve(root, "content"), { recursive: true });
writeFileSync(output, `${JSON.stringify({
  version: 2,
  source: "Conte os Feitos — Expansão Wordle",
  reviewStatus: "APPROVED_BY_PROJECT_OWNER",
  contents: rows,
}, null, 2)}\n`);

const byLength = Object.fromEntries([5, 6, 7].map(length => [length, rows.filter(entry => entry.payload.word.length === length).length]));
console.log(JSON.stringify({ output, total: rows.length, byLength }, null, 2));
