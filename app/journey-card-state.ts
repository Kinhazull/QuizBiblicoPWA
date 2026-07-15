export type JourneyCardData = {
  serverNow?: number;
  current?: { id: string; title: string; theme?: string; opensAt: number; closesAt: number; attemptLimit?: number; secondsPerQuestion?: number; practiceAllowed?: boolean } | null;
  next?: { id: string; title: string; opensAt: number } | null;
  recent?: { id: string; title: string; closesAt: number; bestScore?: number } | null;
  completion?: { attemptsUsed: number; completed: boolean; optionalAttemptsRemaining: number; bestScore: number; inProgress?: boolean } | null;
  practice?: { completed: number; inProgress: boolean } | null;
  ranking?: { position: number; provisional: boolean } | null;
};

export type JourneyCardView = { eyebrow: string; title: string; detail: string; action: string; href: string; tone: string; meta?: string };

export function getJourneyCardView(data: JourneyCardData | null, remaining: (target?: number) => string): JourneyCardView {
  if (!data) return { eyebrow: "JORNADA DA SEMANA", title: "Preparando sua jornada", detail: "Buscando as informações mais recentes.", action: "AGUARDE", href: "#", tone: "waiting" };
  const { current, next, recent, completion, practice } = data;
  if (current) {
    const attemptsLeft = Math.max(0, completion?.optionalAttemptsRemaining ?? current.attemptLimit ?? 2);
    const meta = `${current.secondsPerQuestion || 20}s por pergunta · termina em ${remaining(current.closesAt)}`;
    if (completion?.inProgress) return { eyebrow: "JORNADA EM ANDAMENTO", title: current.title, detail: "Sua tentativa está em andamento e foi preservada com segurança.", action: "CONTINUAR JORNADA", href: "/jogar", tone: "active", meta };
    if (!completion?.completed) return { eyebrow: "JORNADA OFICIAL DISPONÍVEL", title: current.title, detail: `Você possui ${attemptsLeft} tentativa(s) oficial(is) disponível(is).`, action: "INICIAR JORNADA", href: "/jogar", tone: "available", meta };
    if (attemptsLeft > 0) return { eyebrow: "RESULTADO REGISTRADO", title: current.title, detail: `Você ainda possui ${attemptsLeft} tentativa(s) para melhorar seu resultado nesta Jornada.`, action: "MELHORAR RESULTADO", href: "/jogar", tone: "recorded", meta };
    if (current.practiceAllowed && practice?.inProgress) return { eyebrow: "JORNADA DE TREINO", title: current.title, detail: "Seu treino está em andamento e pode ser retomado.", action: "CONTINUAR TREINO", href: "/jogar?modo=treino", tone: "training", meta };
    if (current.practiceAllowed && practice?.completed) return { eyebrow: "JORNADA DE TREINO CONCLUÍDA", title: current.title, detail: "O treino não altera sua classificação oficial.", action: "JOGAR NOVAMENTE", href: "/jogar?modo=treino", tone: "training", meta };
    if (current.practiceAllowed) return { eyebrow: "JORNADA CONCLUÍDA", title: current.title, detail: `Melhor resultado: ${Number(completion?.bestScore || 0).toLocaleString("pt-BR")} pontos.`, action: "INICIAR TREINO", href: "/jogar?modo=treino", tone: "completed", meta };
    return { eyebrow: "JORNADA CONCLUÍDA", title: current.title, detail: `Melhor resultado: ${Number(completion?.bestScore || 0).toLocaleString("pt-BR")} pontos.`, action: "VER CLASSIFICAÇÃO", href: "/rankings", tone: "completed", meta };
  }
  if (next) return { eyebrow: "PRÓXIMA JORNADA", title: next.title, detail: `Começa em ${remaining(next.opensAt)}.`, action: "VER CLASSIFICAÇÃO", href: "/rankings", tone: "waiting", meta: "A nova jornada será liberada automaticamente." };
  if (recent) return { eyebrow: "JORNADA ENCERRADA", title: recent.title, detail: recent.bestScore ? `Seu melhor resultado foi ${Number(recent.bestScore).toLocaleString("pt-BR")} pontos.` : "O período de participação foi encerrado.", action: recent.bestScore ? "VER RESULTADO" : "VER CLASSIFICAÇÃO", href: recent.bestScore ? "/jornada" : "/rankings", tone: "closed", meta: "A classificação final já está disponível." };
  return { eyebrow: "PRÓXIMA JORNADA", title: "Em preparação", detail: "A próxima jornada ainda não foi agendada.", action: "VER CLASSIFICAÇÃO", href: "/rankings", tone: "waiting" };
}
