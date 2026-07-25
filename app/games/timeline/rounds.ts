export type TimelineEvent = {
  id: string;
  title: string;
  position: number;
};

export type TimelineRound = {
  id: string;
  title: string;
  events: readonly [TimelineEvent, TimelineEvent, TimelineEvent, TimelineEvent];
};

export const TIMELINE_ROUNDS: readonly TimelineRound[] = [
  {
    id: "origens-e-promessa",
    title: "Origens e promessa",
    events: [
      { id: "criacao", title: "Deus cria os céus e a terra", position: 1 },
      { id: "diluvio", title: "Noé e sua família entram na arca", position: 2 },
      { id: "chamado-abraao", title: "Abraão é chamado por Deus", position: 3 },
      { id: "exodo", title: "Israel sai do Egito", position: 4 },
    ],
  },
  {
    id: "reis-de-israel",
    title: "Reis de Israel",
    events: [
      { id: "davi-ungido", title: "Samuel unge Davi", position: 1 },
      { id: "golias", title: "Davi derrota Golias", position: 2 },
      { id: "davi-rei", title: "Davi se torna rei", position: 3 },
      { id: "templo-salomao", title: "Salomão constrói o templo", position: 4 },
    ],
  },
  {
    id: "vida-de-jesus",
    title: "Vida de Jesus",
    events: [
      { id: "nascimento-jesus", title: "Jesus nasce em Belém", position: 1 },
      { id: "batismo-jesus", title: "Jesus é batizado por João", position: 2 },
      { id: "crucificacao", title: "Jesus é crucificado", position: 3 },
      { id: "ressurreicao", title: "Jesus ressuscita", position: 4 },
    ],
  },
  {
    id: "igreja-primitiva",
    title: "Igreja Primitiva",
    events: [
      { id: "pentecostes", title: "O Espírito Santo desce no Pentecostes", position: 1 },
      { id: "estevao", title: "Estêvão testemunha até a morte", position: 2 },
      { id: "conversao-saulo", title: "Saulo encontra Jesus no caminho de Damasco", position: 3 },
      { id: "viagens-paulo", title: "Paulo inicia suas viagens missionárias", position: 4 },
    ],
  },
] as const;

