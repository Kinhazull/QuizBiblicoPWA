export type GameStatus = "available" | "development";

export type PlatformGame = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  objective: string;
  mechanics: string[];
  status: GameStatus;
  primaryButton: "Jogar" | "Ver detalhes";
  route: string;
  image: string;
};

export const gameCatalog: readonly PlatformGame[] = [
  { id: "quiz-biblico", slug: "quiz-biblico", name: "Quiz Bíblico", shortDescription: "Teste seus conhecimentos e participe das Jornadas semanais.", description: "Responda perguntas de toda a Bíblia, melhore seu resultado e acompanhe sua classificação.", objective: "Aprender, recordar e compartilhar a Palavra por meio de desafios semanais.", mechanics: ["Dez perguntas por Jornada", "Pontuação por acerto, agilidade e sequência", "Ranking e medalhas competitivas"], status: "available", primaryButton: "Jogar", route: "/jogar", image: "📖" },
  { id: "wordle-biblico", slug: "wordle-biblico", name: "Wordle Bíblico", shortDescription: "Descubra a palavra bíblica usando pistas e tentativas limitadas.", description: "Um desafio de palavras inspirado em personagens, lugares, livros e temas de toda a Bíblia.", objective: "Encontrar a palavra bíblica do desafio com o menor número possível de tentativas.", mechanics: ["Uma palavra por desafio", "Letras recebem pistas por cor", "Tentativas limitadas para chegar à resposta"], status: "development", primaryButton: "Ver detalhes", route: "/jogos/wordle-biblico", image: "🔤" },
  { id: "jogo-tres-pistas", slug: "jogo-das-3-pistas", name: "Jogo das 3 Pistas", shortDescription: "Adivinhe a resposta bíblica a partir de até três pistas.", description: "Cada pista revela um pouco mais sobre um personagem, lugar, acontecimento ou ensinamento bíblico.", objective: "Identificar a resposta usando a menor quantidade de pistas possível.", mechanics: ["Até três pistas progressivas", "Mais pontos ao acertar mais cedo", "Conteúdo amplo de toda a Bíblia"], status: "development", primaryButton: "Ver detalhes", route: "/jogos/jogo-das-3-pistas", image: "🔎" },
] as const;

export function getGameBySlug(slug: string) {
  return gameCatalog.find(game => game.slug === slug);
}
