export type WhoAmICharacter = {
  id: string;
  name: string;
  hints: readonly [string, string, string, string, string];
  optionIds: readonly [string, string, string, string];
};

export const WHO_AM_I_CHARACTERS: readonly WhoAmICharacter[] = [
  {
    id: "moises",
    name: "Moisés",
    hints: [
      "Minha história foi marcada pelas águas desde a infância.",
      "Fui criado dentro de um palácio.",
      "Deus falou comigo por meio de uma sarça em chamas.",
      "Confrontei o faraó e anunciei as pragas do Egito.",
      "Conduzi o povo de Israel na travessia do Mar Vermelho.",
    ],
    optionIds: ["moises", "josue", "arao", "jose"],
  },
  {
    id: "davi",
    name: "Davi",
    hints: [
      "Comecei minha trajetória cuidando dos animais da família.",
      "Tocava um instrumento para acalmar um rei.",
      "Fui escolhido por Samuel quando ainda era jovem.",
      "Enfrentei um guerreiro usando uma funda.",
      "Tornei-me rei de Israel e escrevi muitos salmos.",
    ],
    optionIds: ["davi", "salomao", "saul", "samuel"],
  },
  {
    id: "ester",
    name: "Ester",
    hints: [
      "Vivi longe da terra de meus antepassados.",
      "Meu primo teve papel importante em minha criação.",
      "Fui escolhida para ocupar uma posição no palácio.",
      "Arrisquei minha vida ao entrar sem convite diante do rei.",
      "Intercedi para salvar o povo judeu de uma conspiração.",
    ],
    optionIds: ["ester", "rute", "debora", "maria"],
  },
  {
    id: "paulo",
    name: "Paulo",
    hints: [
      "Recebi educação rigorosa nas tradições de meu povo.",
      "No início, persegui seguidores de Jesus.",
      "Uma luz mudou minha vida durante uma viagem.",
      "Fiz viagens missionárias e plantei igrejas.",
      "Escrevi várias cartas presentes no Novo Testamento.",
    ],
    optionIds: ["paulo", "pedro", "joao", "tiago"],
  },
  {
    id: "daniel",
    name: "Daniel",
    hints: [
      "Fui levado ainda jovem para viver em um império estrangeiro.",
      "Escolhi não me contaminar com a comida do rei.",
      "Deus me concedeu sabedoria para interpretar sonhos.",
      "Mantive minhas orações mesmo quando foram proibidas.",
      "Passei uma noite em uma cova cheia de leões.",
    ],
    optionIds: ["daniel", "jeremias", "ezequiel", "esdras"],
  },
  {
    id: "noe",
    name: "Noé",
    hints: [
      "Vivi em uma época de grande violência e corrupção.",
      "Encontrei favor diante de Deus.",
      "Recebi instruções detalhadas para uma grande construção.",
      "Reuni minha família e animais antes de uma catástrofe.",
      "Construí uma arca e sobrevivi ao dilúvio.",
    ],
    optionIds: ["noe", "abraao", "lo", "isaque"],
  },
  {
    id: "jose",
    name: "José",
    hints: [
      "Era um dos filhos mais novos de uma grande família.",
      "Recebi de meu pai uma túnica especial.",
      "Meus irmãos me venderam e fui levado para outro país.",
      "Deus me ajudou a interpretar os sonhos de um governante.",
      "Tornei-me autoridade no Egito e salvei minha família da fome.",
    ],
    optionIds: ["jose", "benjamim", "jaco", "ruben"],
  },
  {
    id: "elias",
    name: "Elias",
    hints: [
      "Minha missão aconteceu durante o reinado de governantes idólatras.",
      "Fui alimentado por aves durante um período de seca.",
      "Hospedei-me com uma viúva e seu filho.",
      "Desafiei profetas de Baal no monte Carmelo.",
      "Fui levado ao céu em um redemoinho acompanhado por carruagens de fogo.",
    ],
    optionIds: ["elias", "eliseu", "isaias", "joao"],
  },
] as const;

const FALLBACK_NAMES: Readonly<Record<string, string>> = {
  josue: "Josué", arao: "Arão", salomao: "Salomão", saul: "Saul", samuel: "Samuel",
  rute: "Rute", debora: "Débora", maria: "Maria", pedro: "Pedro", joao: "João",
  tiago: "Tiago", jeremias: "Jeremias", ezequiel: "Ezequiel", esdras: "Esdras",
  abraao: "Abraão", lo: "Ló", isaque: "Isaque", benjamim: "Benjamim", jaco: "Jacó",
  ruben: "Rúben", eliseu: "Eliseu", isaias: "Isaías",
};

export function whoAmIOptionName(id: string) {
  return WHO_AM_I_CHARACTERS.find(character => character.id === id)?.name || FALLBACK_NAMES[id] || id;
}
