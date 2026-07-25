export type ThreeCluesQuestion = {
  id: string;
  answer: string;
  clues: readonly [string, string, string];
};

export const THREE_CLUES_QUESTIONS: readonly ThreeCluesQuestion[] = [
  {
    id: "noe",
    answer: "Noé",
    clues: [
      "Deus me escolheu para preservar vidas durante um grande juízo.",
      "Construí algo enorme seguindo medidas dadas pelo próprio Deus.",
      "Entrei em uma arca com minha família e muitos animais.",
    ],
  },
  {
    id: "davi",
    answer: "Davi",
    clues: [
      "Antes de governar, cuidei do rebanho de minha família.",
      "Minha amizade com Jônatas ficou conhecida pela lealdade.",
      "Venci Golias usando uma funda e uma pedra.",
    ],
  },
  {
    id: "ester",
    answer: "Ester",
    clues: [
      "Precisei demonstrar coragem diante de uma ameaça ao meu povo.",
      "Fui orientada por meu primo Mordecai.",
      "Tornei-me rainha e intercedi diante do rei.",
    ],
  },
  {
    id: "jonas",
    answer: "Jonas",
    clues: [
      "Recebi uma missão que inicialmente tentei evitar.",
      "Minha viagem envolveu uma tempestade e marinheiros assustados.",
      "Passei três dias dentro de um grande peixe.",
    ],
  },
] as const;

