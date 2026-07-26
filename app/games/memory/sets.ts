export type MemoryPair = { id: string; title: string; icon: string };
export type MemorySet = { id: string; title: string; pairs: readonly MemoryPair[] };

export const MEMORY_SETS: readonly MemorySet[] = [{
  id: "simbolos-da-biblia",
  title: "Símbolos e acontecimentos",
  pairs: [
    { id: "arca", title: "Arca de Noé", icon: "🛶" },
    { id: "tabuas", title: "Tábuas da Lei", icon: "📜" },
    { id: "funda", title: "Davi e a funda", icon: "🪨" },
    { id: "peixe", title: "Jonas e o grande peixe", icon: "🐟" },
    { id: "estrela", title: "Nascimento de Jesus", icon: "⭐" },
    { id: "paes", title: "Multiplicação dos pães", icon: "🍞" },
    { id: "cruz", title: "Morte e ressurreição", icon: "✝️" },
    { id: "fogo", title: "Pentecostes", icon: "🔥" },
  ],
}] as const;
