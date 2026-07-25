export type ThemeAssociationPair = {
  id: string;
  category: string;
  left: string;
  right: string;
};

export type ThemeAssociationRound = {
  id: string;
  title: string;
  pairs: readonly ThemeAssociationPair[];
};

export const THEME_ASSOCIATION_ROUNDS: readonly ThemeAssociationRound[] = [
  {
    id: "personagens-e-feitos",
    title: "Personagens e feitos",
    pairs: [
      { id: "noe-arca", category: "Personagem e objeto", left: "Noé", right: "Arca" },
      { id: "davi-golias", category: "Personagem e acontecimento", left: "Davi", right: "Derrotou Golias" },
      { id: "ester-povo", category: "Personagem e acontecimento", left: "Ester", right: "Intercedeu por seu povo" },
      { id: "moises-mar", category: "Personagem e acontecimento", left: "Moisés", right: "Travessia do Mar Vermelho" },
    ],
  },
  {
    id: "livros-e-lugares",
    title: "Livros e lugares",
    pairs: [
      { id: "atos-paulo", category: "Livro e personagem", left: "Atos", right: "Paulo" },
      { id: "rute-noemi", category: "Livro e personagem", left: "Rute", right: "Noemi" },
      { id: "belem-nascimento", category: "Lugar e acontecimento", left: "Belém", right: "Nascimento de Jesus" },
      { id: "jerico-muralhas", category: "Lugar e acontecimento", left: "Jericó", right: "Queda das muralhas" },
    ],
  },
  {
    id: "milagres-e-parabolas",
    title: "Milagres e parábolas",
    pairs: [
      { id: "lazaro-jesus", category: "Milagre e personagem", left: "Ressurreição de Lázaro", right: "Jesus" },
      { id: "caminhar-pedro", category: "Milagre e personagem", left: "Caminhar sobre as águas", right: "Pedro" },
      { id: "semeador-semente", category: "Parábola e elemento central", left: "O semeador", right: "Semente" },
      { id: "samaritano-compaixao", category: "Parábola e elemento central", left: "Bom samaritano", right: "Compaixão" },
    ],
  },
] as const;
