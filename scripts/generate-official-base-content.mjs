// HISTORICAL / NOT FOR RELEASE USE.
// The active 380-item pack is already versioned. This historical generator
// depends on a blocked full-text source removed from the active v2 tree.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bible = JSON.parse(readFileSync(resolve(root, "bible-acf.json"), "utf8").replace(/^\uFEFF/, ""));
const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
const wordleWords = `TERRA FILHO HOMEM JESUS OLHOS LUGAR EGITO TEMPO SERVO PORTA CARNE IRMAO ALTAR AGUAS CAMPO SANTO MONTE REINO NOITE FARAO PRATA MORTE FILHA CINCO TENDA MUNDO OBRAS TRIBO PODER JUIZO ROSTO JUSTO JOSUE GRACA VINHO FRUTO CORPO POMBA LIVRO TRONO PEDRA PAULO PEDRO NORTE JOABE TEMOR NACAO MOABE VENTO COBRE HONRA SINAL OSSOS LANCA NOMES POBRE ELIAS FERRO NUVEM TRIGO LINHO SABIO FESTA ACABE ANJOS CANAA PRAGA SERVA AMADO CHUVA ALMAS VISAO SIMAO SANTA ROUPA ROCHA LIMPO RUBEN SIRIA BETEL CARRO PATIO LIVRE PECAR RAMOS BRACO ARMAS COROA ABNER ABRAO SONHO LABAO SINAI VASOS ASAFE JONAS JUDAS MARIA LUCAS SAULO JAIRO DARIO FELIX CARTA CEIFA MANTO MOEDA CINTO ODRES FIGOS LIRIO CEDRO SALEM BACIA SILAS URIAS PEIXE NARDO JEJUM TARSO`.split(/\s+/);

if (wordleWords.length !== 120 || new Set(wordleWords).size !== 120 || wordleWords.some(word => word.length !== 5)) {
  throw new Error(`Wordle catalogue must contain 120 unique five-letter words; received ${wordleWords.length}.`);
}

const verses = bible.flatMap((book, bookIndex) => book.chapters.flatMap((chapter, chapterIndex) =>
  chapter.map((text, verseIndex) => ({
    text,
    normalized: normalize(text),
    reference: `${book.name} ${chapterIndex + 1}:${verseIndex + 1}`,
    testament: bookIndex < 39 ? "Antigo Testamento" : "Novo Testamento",
  })),
));

const wordle = wordleWords.map((word, index) => {
  const verse = verses.find(item => (item.normalized.match(/[A-Z]+/g) ?? []).includes(word));
  if (!verse) throw new Error(`No biblical occurrence found for ${word}.`);
  const characterWords = new Set(["JOSUE", "PAULO", "PEDRO", "JOABE", "ELIAS", "SIMAO", "ACABE", "RUBEN", "ABNER", "ABRAO", "LABAO", "ASAFE", "JONAS", "JUDAS", "MARIA", "LUCAS", "SAULO", "JAIRO", "DARIO", "FELIX", "SILAS", "URIAS"]);
  const placeWords = new Set(["EGITO", "CANAA", "SIRIA", "BETEL", "MOABE", "SINAI", "SALEM", "TARSO"]);
  const objectWords = new Set(["ALTAR", "PORTA", "TENDA", "PRATA", "VINHO", "TRONO", "PEDRA", "COBRE", "SINAL", "OSSOS", "LANCA", "FERRO", "NUVEM", "TRIGO", "LINHO", "ROUPA", "COROA", "VASOS", "CARTA", "MANTO", "MOEDA", "CINTO", "ODRES", "CEDRO", "BACIA", "POMBA", "FIGOS", "LIRIO", "PEIXE", "NARDO"]);
  const category = characterWords.has(word) ? "Personagens" : placeWords.has(word) ? "Lugares" : objectWords.has(word) ? "Objetos" : "Conceitos";
  const hint = category === "Personagens"
    ? `Personagem bíblico com o tamanho exigido pelo jogo, mencionado em ${verse.reference}.`
    : category === "Lugares"
      ? `Lugar ou povo bíblico com o tamanho exigido pelo jogo, relacionado a ${verse.reference}.`
      : category === "Objetos"
        ? `Objeto, elemento ou símbolo bíblico com o tamanho exigido pelo jogo, relacionado a ${verse.reference}.`
        : `Palavra reconhecível do vocabulário bíblico, com o tamanho exigido pelo jogo, relacionada a ${verse.reference}.`;
  return {
    externalId: `wordle-${String(index + 1).padStart(3, "0")}-${word.toLowerCase()}`,
    gameType: "wordle-biblico",
    category,
    difficulty: index % 5 === 0 ? "HARD" : index % 2 === 0 ? "MEDIUM" : "EASY",
    biblicalReference: verse.reference,
    tags: [verse.testament, "Palavra bíblica"],
    payload: {
      word,
      hint,
    },
  };
});

const timelines = [
  ["Da criação ao dilúvio", "Gênesis 1–9", ["Criação dos céus e da terra", "Criação do ser humano", "Queda no Éden", "Nascimento de Sete", "Enoque anda com Deus", "Dilúvio e aliança com Noé"]],
  ["Patriarcas da promessa", "Gênesis 12–35", ["Chamado de Abraão", "Nascimento de Isaque", "Casamento de Isaque e Rebeca", "Nascimento de Jacó e Esaú", "Jacó recebe a bênção", "Jacó retorna a Canaã"]],
  ["José no Egito", "Gênesis 37–50", ["José recebe sonhos", "José é vendido pelos irmãos", "José serve na casa de Potifar", "José interpreta sonhos na prisão", "José governa o Egito", "A família de Jacó se estabelece no Egito"]],
  ["Êxodo e aliança", "Êxodo 1–20", ["Nascimento de Moisés", "Moisés foge para Midiã", "Chamado na sarça ardente", "As pragas atingem o Egito", "Travessia do mar", "Entrega dos Dez Mandamentos"]],
  ["Conquista e juízes", "Josué 1–Juízes 16", ["Josué assume a liderança", "Travessia do Jordão", "Queda de Jericó", "Débora julga Israel", "Gideão vence os midianitas", "Sansão enfrenta os filisteus"]],
  ["Reino de Israel", "1 Samuel 8–1 Reis 12", ["Saul é ungido rei", "Davi derrota Golias", "Davi reina sobre Israel", "Salomão pede sabedoria", "Construção do templo", "Divisão do reino"]],
  ["Exílio e retorno", "2 Reis 24–Neemias 6", ["Jerusalém é sitiada", "Templo é destruído", "Judá vai para o exílio", "Ciro autoriza o retorno", "Templo é reconstruído", "Muros de Jerusalém são restaurados"]],
  ["Ministério de Jesus", "Mateus 3–21", ["Batismo de Jesus", "Tentação no deserto", "Chamado dos primeiros discípulos", "Sermão do Monte", "Transfiguração", "Entrada triunfal em Jerusalém"]],
  ["Paixão e ressurreição", "Mateus 26–28", ["Última Ceia", "Oração no Getsêmani", "Prisão de Jesus", "Crucificação", "Sepultamento", "Ressurreição"]],
  ["Igreja e missão", "Atos 1–28", ["Ascensão de Jesus", "Pentecostes", "Conversão de Saulo", "Primeira viagem missionária", "Concílio de Jerusalém", "Paulo chega a Roma"]],
];

const timeline = timelines.flatMap(([title, reference, events], sequenceIndex) =>
  [0, 1, 2, 3].map((start, windowIndex) => ({
    externalId: `timeline-${String(sequenceIndex * 4 + windowIndex + 1).padStart(3, "0")}`,
    gameType: "linha-do-tempo-biblica",
    category: "Eventos",
    difficulty: windowIndex === 0 ? "EASY" : windowIndex === 3 ? "HARD" : "MEDIUM",
    biblicalReference: reference,
    tags: [sequenceIndex < 7 ? "Antigo Testamento" : "Novo Testamento", "Cronologia bíblica"],
    payload: {
      title: `${title} — ordem narrativa ${windowIndex + 1}`,
      events: events.slice(start, start + 3).map((eventTitle, position) => ({ title: eventTitle, position: position + 1 })),
    },
  })),
);

const facts = [
  ["Adão", "primeiro homem", "Gênesis 2:7", ["Fui formado do pó", "Vivi no jardim do Éden", "Dei nome aos animais"]],
  ["Eva", "primeira mulher", "Gênesis 2:22", ["Fui formada a partir do homem", "Vivi no Éden", "Sou chamada mãe de todos os viventes"]],
  ["Noé", "arca do dilúvio", "Gênesis 6:14", ["Achei graça diante de Deus", "Construí uma grande embarcação", "Minha família sobreviveu ao dilúvio"]],
  ["Abraão", "pai de uma grande nação", "Gênesis 12:2", ["Saí da minha terra por fé", "Recebi uma promessa sobre descendência", "Isaque foi meu filho"]],
  ["Sara", "mãe de Isaque", "Gênesis 21:2", ["Meu nome foi mudado", "Ri ao ouvir uma promessa", "Tive um filho na velhice"]],
  ["Isaque", "filho da promessa", "Gênesis 21:3", ["Nasci quando meus pais eram idosos", "Fui levado ao monte Moriá", "Casei-me com Rebeca"]],
  ["Jacó", "pai das doze tribos", "Gênesis 35:10", ["Sonhei com uma escada", "Meu nome foi mudado para Israel", "Tive doze filhos"]],
  ["José", "governador no Egito", "Gênesis 41:41", ["Recebi uma túnica especial", "Interpretei sonhos", "Fui elevado por Faraó"]],
  ["Moisés", "libertação do Egito", "Êxodo 3:10", ["Fui criado na casa de Faraó", "Vi uma sarça que ardia", "Conduzi Israel para fora do Egito"]],
  ["Arão", "primeiro sumo sacerdote", "Êxodo 28:1", ["Fui irmão de um libertador", "Falei diante de Faraó", "Servi como sumo sacerdote"]],
  ["Josué", "conquista de Canaã", "Josué 1:6", ["Servi ao lado de Moisés", "Atravessei o Jordão", "Liderei a conquista de Canaã"]],
  ["Raabe", "cordão vermelho", "Josué 2:18", ["Morava em Jericó", "Protegi dois espias", "Usei um cordão escarlate como sinal"]],
  ["Gideão", "trezentos guerreiros", "Juízes 7:7", ["Malhei trigo escondido", "Pedi sinais com uma lã", "Venci com trezentos homens"]],
  ["Sansão", "força extraordinária", "Juízes 16:17", ["Fui nazireu", "Minha força estava ligada ao cabelo", "Derrubei colunas dos filisteus"]],
  ["Rute", "lealdade a Noemi", "Rute 1:16", ["Era moabita", "Acompanhei minha sogra", "Casei-me com Boaz"]],
  ["Samuel", "profeta desde menino", "1 Samuel 3:10", ["Fui dedicado ao Senhor ainda pequeno", "Ouvi meu nome durante a noite", "Ungi reis de Israel"]],
  ["Saul", "primeiro rei de Israel", "1 Samuel 10:1", ["Era da tribo de Benjamim", "Procurei jumentas perdidas", "Fui o primeiro rei de Israel"]],
  ["Davi", "rei e salmista", "1 Samuel 16:13", ["Cuidei de ovelhas", "Derrotei um gigante", "Fui rei em Jerusalém"]],
  ["Salomão", "sabedoria e templo", "1 Reis 3:12", ["Pedi sabedoria", "Julguei duas mulheres", "Construí o templo"]],
  ["Elias", "fogo no Carmelo", "1 Reis 18:38", ["Fui alimentado por corvos", "Desafiei profetas de Baal", "Subi num redemoinho"]],
  ["Eliseu", "manto de Elias", "2 Reis 2:13", ["Deixei bois para seguir um profeta", "Recebi uma porção dobrada", "Vi um machado flutuar"]],
  ["Naamã", "cura no Jordão", "2 Reis 5:14", ["Era comandante sírio", "Sofria de lepra", "Mergulhei sete vezes no Jordão"]],
  ["Ester", "rainha que protegeu seu povo", "Ester 4:14", ["Fui criada por meu primo", "Tornei-me rainha", "Intercedi pelo povo judeu"]],
  ["Mordecai", "guardião de Ester", "Ester 2:7", ["Criei uma prima órfã", "Recusei curvar-me a Hamã", "Fui honrado pelo rei"]],
  ["Jó", "perseverança no sofrimento", "Jó 1:21", ["Era íntegro e rico", "Perdi bens e filhos", "Permaneci buscando a Deus no sofrimento"]],
  ["Isaías", "visão do trono", "Isaías 6:1", ["Vi serafins", "Meus lábios foram tocados por uma brasa", "Profetizei sobre o Servo sofredor"]],
  ["Jeremias", "profeta choroso", "Jeremias 1:5", ["Fui chamado antes de nascer", "Usei um jugo como sinal", "Anunciei uma nova aliança"]],
  ["Ezequiel", "vale de ossos secos", "Ezequiel 37:1", ["Profetizei entre exilados", "Vi rodas numa visão", "Falei a um vale de ossos secos"]],
  ["Daniel", "cova dos leões", "Daniel 6:16", ["Fui levado para Babilônia", "Interpretei sonhos", "Passei uma noite entre leões"]],
  ["Jonas", "grande peixe", "Jonas 1:17", ["Fugi de uma missão", "Fui lançado ao mar", "Um grande peixe me engoliu"]],
  ["Esdras", "ensino da Lei", "Esdras 7:10", ["Era escriba", "Retornei do exílio", "Preparei o coração para ensinar a Lei"]],
  ["Neemias", "muros de Jerusalém", "Neemias 2:17", ["Servi como copeiro", "Chorei por Jerusalém", "Coordenei a reconstrução dos muros"]],
  ["Maria", "mãe de Jesus", "Lucas 1:31", ["Recebi a visita de Gabriel", "Cantei sobre a grandeza de Deus", "Dei à luz Jesus"]],
  ["José de Nazaré", "proteção da família de Jesus", "Mateus 2:13", ["Era descendente de Davi", "Recebi orientação em sonhos", "Levei minha família ao Egito"]],
  ["João Batista", "voz no deserto", "Mateus 3:3", ["Era filho de Zacarias e Isabel", "Preguei no deserto", "Batizei Jesus"]],
  ["Pedro", "pescador e apóstolo", "Mateus 16:18", ["Era pescador", "Andei sobre as águas", "Fui chamado pedra"]],
  ["André", "discípulo que apresentou Pedro", "João 1:42", ["Segui primeiro João Batista", "Levei meu irmão a Jesus", "Ajudei a encontrar pães e peixes"]],
  ["Tiago", "filho de Zebedeu", "Marcos 1:19", ["Trabalhava com redes", "Era irmão de João", "Fiz parte dos doze apóstolos"]],
  ["João", "discípulo amado", "João 13:23", ["Era filho de Zebedeu", "Fiquei junto à cruz", "Sou chamado discípulo amado"]],
  ["Mateus", "cobrador chamado por Jesus", "Mateus 9:9", ["Trabalhava numa coletoria", "Deixei meu posto para seguir Jesus", "Fui contado entre os doze"]],
  ["Zaqueu", "encontro numa figueira", "Lucas 19:4", ["Era chefe dos publicanos", "Era de pequena estatura", "Subi numa árvore para ver Jesus"]],
  ["Nicodemos", "visita durante a noite", "João 3:2", ["Era fariseu", "Procurei Jesus à noite", "Ouvi sobre nascer de novo"]],
  ["Marta", "serviço em Betânia", "Lucas 10:40", ["Morava em Betânia", "Era irmã de Maria e Lázaro", "Preocupava-me com muitos serviços"]],
  ["Maria de Betânia", "perfume aos pés de Jesus", "João 12:3", ["Era irmã de Marta", "Sentei-me para ouvir Jesus", "Derramei perfume sobre seus pés"]],
  ["Lázaro", "ressuscitado em Betânia", "João 11:43", ["Era amigo de Jesus", "Fui sepultado numa caverna", "Saí do túmulo ao ouvir um chamado"]],
  ["Maria Madalena", "primeira testemunha da ressurreição", "João 20:16", ["Acompanhei Jesus", "Fui ao sepulcro cedo", "Encontrei o Cristo ressuscitado"]],
  ["Estêvão", "primeiro mártir cristão", "Atos 7:59", ["Servi às mesas", "Vi o céu aberto", "Fui apedrejado por meu testemunho"]],
  ["Filipe", "evangelista na estrada de Gaza", "Atos 8:35", ["Fui escolhido para servir", "Preguei em Samaria", "Expliquei Isaías a um etíope"]],
  ["Paulo", "apóstolo dos gentios", "Atos 9:15", ["Persegui a igreja", "Encontrei Jesus no caminho de Damasco", "Levei o evangelho aos gentios"]],
  ["Barnabé", "filho da consolação", "Atos 4:36", ["Era levita de Chipre", "Apoiei Saulo em Jerusalém", "Viajei em missão com Paulo"]],
  ["Silas", "cânticos na prisão", "Atos 16:25", ["Fui líder em Jerusalém", "Viajei com Paulo", "Cantei hinos numa prisão"]],
  ["Timóteo", "jovem cooperador", "1 Timóteo 4:12", ["Minha mãe era judia", "Acompanhei Paulo", "Fui orientado a ser exemplo na juventude"]],
  ["Lídia", "vendedora de púrpura", "Atos 16:14", ["Era de Tiatira", "Negociava tecido valioso", "Abri minha casa aos missionários"]],
  ["Priscila", "instrutora de Apolo", "Atos 18:26", ["Trabalhava com tendas", "Era esposa de Áquila", "Expliquei com mais precisão o caminho de Deus"]],
  ["Áquila", "cooperador fabricante de tendas", "Atos 18:2", ["Era natural do Ponto", "Trabalhei com Paulo", "Era esposo de Priscila"]],
  ["Apolo", "pregador eloquente", "Atos 18:24", ["Era natural de Alexandria", "Conhecia bem as Escrituras", "Recebi instrução de Priscila e Áquila"]],
  ["Filemom", "senhor de Onésimo", "Filemom 1:10-16", ["Recebi uma carta de Paulo", "Uma igreja se reunia em minha casa", "Fui chamado a receber um irmão"]],
  ["Onésimo", "servo recebido como irmão", "Filemom 1:16", ["Meu nome significa útil", "Encontrei Paulo durante sua prisão", "Deveria ser recebido como irmão"]],
  ["Tito", "cooperador em Creta", "Tito 1:5", ["Era gentio convertido", "Acompanhei Paulo", "Fui deixado em Creta para organizar igrejas"]],
  ["Lucas", "médico e companheiro de Paulo", "Colossenses 4:14", ["Exercia a medicina", "Acompanhei viagens missionárias", "Escrevi um evangelho e Atos"]],
];

if (facts.length !== 60 || new Set(facts.map(([answer]) => answer)).size !== 60) throw new Error("Facts catalogue must contain 60 unique entries.");

const diversityFacts = [
  ["Jerusalém", "cidade do templo e cenário da paixão de Jesus", "Salmos 122:6", ["Fui conquistada por Davi", "Abriguei o templo de Salomão", "Jesus foi crucificado junto aos meus limites"]],
  ["Belém", "cidade do nascimento de Jesus", "Miqueias 5:2", ["Também sou chamada cidade de Davi", "Rute viveu em meus campos", "Jesus nasceu em mim"]],
  ["Jordão", "rio atravessado por Israel", "Josué 3:17", ["Marco uma fronteira importante", "Israel me atravessou em terra seca", "Jesus foi batizado em minhas águas"]],
  ["Sinai", "monte da entrega da Lei", "Êxodo 19:20", ["Fico numa região desértica", "Fui coberto por nuvem e fogo", "Moisés recebeu a Lei em mim"]],
  ["Templo", "casa de adoração em Jerusalém", "1 Reis 6:1", ["Salomão iniciou minha construção", "Possuía Lugar Santo e Santíssimo", "Jesus ensinou em meus pátios"]],
  ["Arca da Aliança", "símbolo da presença e da aliança", "Êxodo 25:10", ["Fui feita de madeira revestida de ouro", "Minha tampa era o propiciatório", "As tábuas da aliança foram guardadas em mim"]],
  ["Maná", "alimento no deserto", "Êxodo 16:15", ["Aparecia pela manhã", "Era recolhido conforme a necessidade diária", "Alimentei Israel no deserto"]],
  ["Serpente de bronze", "sinal levantado no deserto", "Números 21:9", ["Fui feita durante uma crise no deserto", "Moisés me colocou sobre uma haste", "Quem olhava para mim permanecia vivo"]],
  ["Mar Vermelho", "travessia durante o Êxodo", "Êxodo 14:21", ["Um vento forte soprou sobre mim", "Abri caminho para Israel", "Minhas águas cobriram o exército egípcio"]],
  ["Sarça ardente", "chamado de Moisés", "Êxodo 3:2", ["Estava no Horebe", "Queimava sem ser consumida", "Deus falou com Moisés a partir de mim"]],
  ["Bom Samaritano", "parábola sobre o próximo", "Lucas 10:33", ["Minha história começa numa estrada perigosa", "Cuidei de um homem ferido", "Ensino quem age como próximo"]],
  ["Ovelha perdida", "parábola da busca e restauração", "Lucas 15:4", ["Faço parte de um grupo de cem", "Um pastor saiu à minha procura", "Minha recuperação provoca alegria"]],
  ["Semeador", "parábola sobre diferentes solos", "Mateus 13:3", ["Saí para realizar meu trabalho", "Minha semente caiu em quatro tipos de solo", "Minha história ensina sobre receber a palavra"]],
  ["Pentecostes", "derramamento do Espírito sobre a Igreja", "Atos 2:1", ["Aconteci durante uma festa judaica", "Línguas como de fogo foram vistas", "Os discípulos falaram em outros idiomas"]],
  ["Ressurreição", "vitória de Jesus sobre a morte", "Mateus 28:6", ["Ocorri no primeiro dia da semana", "O sepulcro foi encontrado vazio", "Jesus apareceu vivo aos discípulos"]],
  ["Páscoa", "memorial da libertação", "Êxodo 12:14", ["Fui instituída no Egito", "Um cordeiro fazia parte da celebração", "Recordo a libertação da escravidão"]],
  ["Graça", "favor de Deus oferecido em Cristo", "Efésios 2:8", ["Não sou resultado de mérito humano", "Relaciono-me à fé e à salvação", "Sou descrita como dom de Deus"]],
  ["Fé", "confiança em Deus", "Hebreus 11:1", ["Relaciono-me ao que se espera", "Sou exemplificada por muitas testemunhas", "Sem mim é impossível agradar a Deus"]],
  ["Nova Aliança", "promessa escrita no coração", "Jeremias 31:31", ["Fui anunciada por um profeta", "Não repito a aliança quebrada pelos antepassados", "A lei é colocada no interior do povo"]],
  ["Igreja", "comunidade reunida em Cristo", "Atos 2:42", ["Persevero no ensino e na comunhão", "Partilho o pão e as orações", "Sou descrita como corpo de Cristo"]],
  ["Tabernáculo", "santuário móvel no deserto", "Êxodo 25:8", ["Fui construído conforme um modelo mostrado a Moisés", "Acompanhei Israel durante a peregrinação", "Abriguei o Lugar Santo e o Santíssimo"]],
  ["Candelabro", "luz do santuário", "Êxodo 25:31", ["Fui moldado em ouro puro", "Possuía sete lâmpadas", "Iluminava o interior do santuário"]],
  ["Muralhas de Jericó", "barreira vencida na conquista", "Josué 6:20", ["Cercava uma cidade de Canaã", "Israel marchou ao meu redor durante sete dias", "Caí após o toque das trombetas e o clamor do povo"]],
  ["Forno ardente", "livramento dos três jovens", "Daniel 3:27", ["Fui aquecido além do habitual", "Recebi três homens fiéis como condenados", "Eles saíram de mim sem cheiro de fumaça"]],
  ["Multiplicação dos pães", "milagre que alimentou a multidão", "João 6:11", ["Comecei com uma provisão pequena", "Uma multidão se assentou para comer", "Doze cestos de pedaços foram recolhidos"]],
  ["Tempestade acalmada", "milagre no mar da Galileia", "Marcos 4:39", ["Aconteci durante uma travessia", "Os discípulos temeram as ondas", "Jesus repreendeu o vento e o mar"]],
  ["Filho Pródigo", "parábola sobre retorno e acolhimento", "Lucas 15:20", ["Minha história envolve uma herança antecipada", "Voltei para casa depois de perder tudo", "Meu pai me recebeu com festa"]],
  ["Dez Virgens", "parábola sobre vigilância", "Mateus 25:1", ["Minha história apresenta lâmpadas e azeite", "Metade do grupo estava preparada", "Ensino a necessidade de vigilância"]],
  ["Salmos", "livro de cânticos e orações", "Salmos 1:1", ["Reúno louvor, lamento e sabedoria", "Muitos de meus textos são associados a Davi", "Sou o maior livro da Bíblia em número de capítulos"]],
  ["Provérbios", "livro de sabedoria prática", "Provérbios 1:2", ["Ensino prudência e entendimento", "Grande parte de minha coleção é associada a Salomão", "Declaro que o temor do Senhor é o princípio do conhecimento"]],
  ["Evangelho de Lucas", "narrativa ordenada sobre Jesus", "Lucas 1:3", ["Fui dirigido a Teófilo", "Destaco pessoas frequentemente esquecidas pela sociedade", "Tenho continuação no livro de Atos"]],
  ["Carta aos Romanos", "exposição do evangelho e da justiça de Deus", "Romanos 1:16", ["Fui enviada a cristãos da capital do império", "Explico a justificação pela fé", "Paulo é meu autor"]],
  ["Torre de Babel", "dispersão das línguas", "Gênesis 11:9", ["Fui planejada numa planície de Sinear", "Meus construtores desejavam fazer um nome para si", "Minha história explica a confusão das línguas"]],
  ["Queda de Jericó", "primeira grande vitória em Canaã", "Josué 6:20", ["Aconteci após a travessia do Jordão", "Sacerdotes tocaram trombetas durante o cerco", "As muralhas cederam depois do clamor do povo"]],
  ["Transfiguração", "revelação da glória de Jesus", "Mateus 17:2", ["Aconteci num monte diante de três discípulos", "Moisés e Elias apareceram", "O rosto de Jesus brilhou como o sol"]],
  ["Concílio de Jerusalém", "decisão da Igreja sobre os gentios", "Atos 15:6", ["Reuni apóstolos e presbíteros", "Debati a entrada dos gentios na comunidade", "Uma carta comunicou minha decisão às igrejas"]],
  ["Amor ao próximo", "mandamento de cuidado com o outro", "Marcos 12:31", ["Sou apresentado junto ao amor a Deus", "Oriento a tratar o outro como a si mesmo", "Jesus me chamou de grande mandamento"]],
  ["Fruto do Espírito", "caráter produzido pelo Espírito", "Gálatas 5:22-23", ["Sou descrito em contraste com as obras da carne", "Incluo domínio próprio e mansidão", "Minha lista começa com amor, alegria e paz"]],
  ["Armadura de Deus", "figura da preparação espiritual", "Efésios 6:11", ["Uso imagens do equipamento de um soldado", "Incluo escudo, capacete e espada", "Represento recursos para permanecer firme"]],
  ["Nova Jerusalém", "cidade da esperança final", "Apocalipse 21:2", ["Desço do céu da parte de Deus", "Sou comparada a uma noiva preparada", "Em mim não há necessidade de templo"]],
];
const mixedFacts = [...facts.slice(0, 20), ...diversityFacts];
if (mixedFacts.length !== 60 || new Set(mixedFacts.map(([answer]) => answer)).size !== 60) throw new Error("Diverse facts catalogue must contain 60 unique entries.");

const categoryAnswers = new Map([
  ["Lugares", ["Jerusalém", "Belém", "Jordão", "Sinai", "Mar Vermelho", "Nova Jerusalém"]],
  ["Objetos", ["Templo", "Arca da Aliança", "Maná", "Serpente de bronze", "Sarça ardente", "Tabernáculo", "Candelabro", "Muralhas de Jericó", "Forno ardente", "Armadura de Deus"]],
  ["Milagres", ["Multiplicação dos pães", "Tempestade acalmada"]],
  ["Parábolas", ["Bom Samaritano", "Ovelha perdida", "Semeador", "Filho Pródigo", "Dez Virgens"]],
  ["Eventos", ["Pentecostes", "Ressurreição", "Páscoa", "Torre de Babel", "Queda de Jericó", "Transfiguração", "Concílio de Jerusalém"]],
  ["Livros", ["Salmos", "Provérbios", "Evangelho de Lucas", "Carta aos Romanos"]],
  ["Ensinamentos", ["Graça", "Fé", "Nova Aliança", "Amor ao próximo", "Fruto do Espírito"]],
  ["Atos", ["Igreja"]],
].flatMap(([category, answers]) => answers.map(answer => [answer, category])));

const factCategory = fact => categoryAnswers.get(fact[0]) ?? "Personagens";
const factTestament = fact => /^(Mateus|Marcos|Lucas|João|Atos|Romanos|Gálatas|Efésios|Apocalipse)/.test(fact[2])
  ? "Novo Testamento"
  : "Antigo Testamento";
const factsForSet = index => mixedFacts.slice((index % 20) * 3, (index % 20) * 3 + 3);
const setMetadata = index => {
  const selectedFacts = factsForSet(index);
  const categories = selectedFacts.map(factCategory);
  const category = categories.every(value => value === categories[0]) ? categories[0] : "Conceitos";
  return {
    category,
    biblicalReference: selectedFacts.map(fact => fact[2]).join("; "),
    tags: [...new Set([...selectedFacts.map(factTestament), ...categories, "Acervo oficial v1"])],
  };
};

const setTitle = (gameType, index) => {
  const category = setMetadata(index).category;
  const titles = {
    "memoria-biblica": {
      Personagens: "Personagens e seus feitos",
      Lugares: "Lugares da história bíblica",
      Objetos: "Símbolos e objetos bíblicos",
      Milagres: "Milagres de Jesus",
      Parábolas: "Parábolas e seus ensinamentos",
      Eventos: "Acontecimentos marcantes",
      Livros: "Livros e mensagens",
      Ensinamentos: "Verdades para recordar",
      Atos: "A comunidade da fé",
      Conceitos: "Conexões da narrativa bíblica",
    },
    "associacao-de-temas": {
      Personagens: "Personagens e acontecimentos",
      Lugares: "Lugares e acontecimentos",
      Objetos: "Objetos e significados",
      Milagres: "Milagres e seus sinais",
      Parábolas: "Parábolas e mensagens",
      Eventos: "Eventos e contexto bíblico",
      Livros: "Livros e temas centrais",
      Ensinamentos: "Ensinamentos e significados",
      Atos: "Igreja e missão",
      Conceitos: "Conecte histórias e ensinamentos",
    },
    "jogo-tres-pistas": {
      Personagens: "Personagens da Bíblia",
      Lugares: "Lugares da Bíblia",
      Objetos: "Objetos e símbolos",
      Milagres: "Milagres de Jesus",
      Parábolas: "Parábolas de Jesus",
      Eventos: "Momentos da história bíblica",
      Livros: "Livros da Bíblia",
      Ensinamentos: "Ensinos e promessas",
      Atos: "Igreja e missão",
      Conceitos: "Descubra pelas pistas",
    },
  };
  return titles[gameType][category];
};

const common = (gameType, externalId, index) => ({
  externalId,
  gameType,
  ...setMetadata(index),
  difficulty: index % 5 === 0 ? "HARD" : index % 2 === 0 ? "MEDIUM" : "EASY",
});

const chunked = (bank, count, width, build) => Array.from({ length: count }, (_, index) =>
  build(bank.slice(index * width, index * width + width), index));

const memoryPairBank = [
  ...mixedFacts.map(([front, back]) => ({ front, back })),
  ...mixedFacts.map(([answer, , , hints]) => ({ front: hints[2], back: answer })),
];
const memory = chunked(memoryPairBank, 40, 3, (selected, index) => ({
  ...common("memoria-biblica", `memory-${String(index + 1).padStart(3, "0")}`, index),
  payload: { title: setTitle("memoria-biblica", index), pairs: selected },
}));

const associationPairBank = [
  ...mixedFacts.map(([left, right]) => ({ left, right })),
  ...mixedFacts.map(([answer, , reference]) => ({ left: reference, right: answer })),
  ...mixedFacts.map(([answer, , , hints]) => ({ left: hints[2], right: answer })),
];
const association = chunked(associationPairBank, 60, 3, (selected, index) => ({
  ...common("associacao-de-temas", `association-${String(index + 1).padStart(3, "0")}`, index),
  payload: { title: setTitle("associacao-de-temas", index), pairs: selected },
}));

const whoChallengeBank = [
  ...facts.map(([answer, , , hints]) => ({ answer, hints })),
  ...facts.map(([answer, association, , hints]) => ({ answer, hints: [hints[0], `Minha trajetória se relaciona a ${association}.`, hints[2]] })),
  ...facts.map(([answer, association, , hints]) => ({ answer, hints: [`Minha atuação ocorreu num período importante da narrativa bíblica.`, hints[0], `Sou lembrado por ${association}.`, hints[2]] })),
];
const whoAmI = chunked(whoChallengeBank, 60, 3, (selected, index) => ({
  ...common("quem-sou-eu", `who-am-i-${String(index + 1).padStart(3, "0")}`, index, facts[index % facts.length][2]),
  payload: { title: `Quem sou eu? — conjunto ${index + 1}`, challenges: selected },
}));

const threeCluesBank = [
  ...mixedFacts.map(([answer, , , clues]) => ({ answer, clues })),
  ...mixedFacts.map(([answer, association, , clues]) => ({ answer, clues: [clues[0], clues[1], `Minha identidade se relaciona a ${association}.`] })),
  ...mixedFacts.map(([answer, association, , clues]) => ({ answer, clues: [`Apareço em uma narrativa importante das Escrituras.`, clues[0], `Sou lembrado por ${association}.`] })),
];
const threeClues = chunked(threeCluesBank, 60, 3, (selected, index) => ({
  ...common("jogo-tres-pistas", `three-clues-${String(index + 1).padStart(3, "0")}`, index),
  payload: { title: setTitle("jogo-tres-pistas", index), challenges: selected },
}));

const contents = [...wordle, ...timeline, ...memory, ...association, ...whoAmI, ...threeClues];
const expected = { "wordle-biblico": 120, "linha-do-tempo-biblica": 40, "memoria-biblica": 40, "associacao-de-temas": 60, "quem-sou-eu": 60, "jogo-tres-pistas": 60 };
for (const [gameType, count] of Object.entries(expected)) {
  const actual = contents.filter(content => content.gameType === gameType).length;
  if (actual !== count) throw new Error(`${gameType}: expected ${count}, received ${actual}.`);
}

writeFileSync(resolve(root, "content/official-base-content-v1.json"), `${JSON.stringify({ version: 1, source: "Conte os Feitos — Acervo Oficial", contents }, null, 2)}\n`);
console.log(`Generated ${contents.length} official content items.`);
