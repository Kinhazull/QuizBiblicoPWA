import type { GameModuleContract } from "./types";

export const gameModules: readonly GameModuleContract[] = [
  {
    id: "quiz-biblico",
    slug: "quiz-biblico",
    name: "Quiz Bíblico",
    shortDescription: "Teste seus conhecimentos com perguntas de toda a Bíblia.",
    description: "Responda perguntas bíblicas em partidas geradas pela plataforma.",
    objective: "Aprender, recordar e compartilhar a Palavra por meio de desafios bíblicos.",
    mechanics: ["Perguntas selecionadas pela plataforma", "Pontuação por acertos", "Resultado validado no servidor"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogar",
    image: "📖",
  },
  {
    id: "wordle-biblico",
    slug: "wordle-biblico",
    name: "Wordle Bíblico",
    shortDescription: "Descubra a palavra bíblica usando pistas e tentativas limitadas.",
    description: "Um desafio de palavras inspirado em personagens, lugares, livros e temas de toda a Bíblia.",
    objective: "Encontrar a palavra bíblica do desafio com o menor número possível de tentativas.",
    mechanics: ["Uma palavra fixa neste MVP", "Letras corretas, presentes e ausentes", "Seis tentativas para chegar à resposta"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/wordle-biblico",
    image: "🔤",
  },
  {
    id: "jogo-tres-pistas",
    slug: "jogo-das-3-pistas",
    name: "Jogo das 3 Pistas",
    shortDescription: "Adivinhe a resposta bíblica a partir de até três pistas.",
    description: "Cada pista revela um pouco mais sobre um personagem, lugar, acontecimento ou ensinamento bíblico.",
    objective: "Identificar a resposta usando a menor quantidade de pistas possível.",
    mechanics: ["Até três pistas progressivas", "Mais pontos ao acertar mais cedo", "Conteúdo amplo de toda a Bíblia"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/jogo-das-3-pistas",
    image: "🔎",
  },
  {
    id: "linha-do-tempo-biblica",
    slug: "linha-do-tempo-biblica",
    name: "Linha do Tempo Bíblica",
    shortDescription: "Organize acontecimentos bíblicos na sequência correta.",
    description: "Relembre a história bíblica colocando quatro acontecimentos em ordem cronológica.",
    objective: "Montar a sequência completa antes de esgotar as tentativas.",
    mechanics: ["Quatro acontecimentos por partida", "Controles para subir e descer", "Três tentativas para confirmar a ordem"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/linha-do-tempo-biblica",
    image: "⏳",
  },
  {
    id: "memoria-biblica",
    slug: "memoria-biblica",
    name: "Memória Bíblica",
    shortDescription: "Encontre pares de símbolos e acontecimentos bíblicos.",
    description: "Exercite a memória combinando cartas relacionadas a personagens, símbolos e acontecimentos da Bíblia.",
    objective: "Encontrar todos os oito pares com a menor quantidade possível de jogadas.",
    mechanics: ["Tabuleiro com dezesseis cartas", "Oito pares bíblicos", "Duas cartas reveladas por vez"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/memoria-biblica",
    image: "🧠",
  },
  {
    id: "associacao-de-temas",
    slug: "associacao-de-temas",
    name: "Associação de Temas",
    shortDescription: "Combine personagens, livros, lugares e acontecimentos bíblicos.",
    description: "Forme associações entre elementos da Bíblia antes de atingir o limite de erros.",
    objective: "Concluir os quatro pares bíblicos com no máximo três associações incorretas.",
    mechanics: ["Quatro pares por rodada", "Seleção por toque ou teclado", "Limite de três erros"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/associacao-de-temas",
    image: "🔗",
  },
  {
    id: "quem-sou-eu",
    slug: "quem-sou-eu",
    name: "Quem Sou Eu?",
    shortDescription: "Descubra personagens bíblicos usando dicas progressivas.",
    description: "Leia as dicas, revele novas pistas quando precisar e escolha o personagem correto.",
    objective: "Identificar o personagem bíblico usando a menor quantidade possível de dicas.",
    mechanics: ["Cinco dicas progressivas", "Quatro alternativas", "Resposta permitida a qualquer momento"],
    status: "available",
    primaryButton: "Jogar",
    route: "/jogos/quem-sou-eu",
    image: "❓",
  },
] as const;

export function getGameModule(slug: string) {
  return gameModules.find(module => module.slug === slug);
}

export function isGamePlayRoute(pathname: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normalizedPath === "/jogar" || gameModules.some(module => module.route === normalizedPath);
}
