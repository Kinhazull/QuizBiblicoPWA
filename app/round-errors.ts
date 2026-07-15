export function roundErrorMessage(result: any) {
  const messages: Record<string,string> = {
    invalid_title: "Informe um título com pelo menos 3 caracteres.", invalid_theme: "Informe um tema com pelo menos 3 caracteres.",
    invalid_opening_date: "Informe uma data e um horário de abertura válidos.", invalid_closing_date: "Informe uma data e um horário de encerramento válidos.",
    invalid_schedule: "O encerramento deve acontecer depois da abertura.", season_required: "Selecione uma temporada para a rodada regular.",
    invalid_season: "A temporada selecionada não está disponível.", round_outside_season: "O período da rodada precisa estar dentro do período da temporada.",
    invalid_question_time: "O tempo por pergunta deve ficar entre 15 e 60 segundos.", invalid_attempt_limit: "O limite deve ficar entre 1 e 5 tentativas.",
    invalid_question_count: "A rodada precisa ter exatamente dez perguntas.", invalid_questions: "Revise as perguntas e suas quatro alternativas.",
    duplicate_in_round: "Existem perguntas repetidas nesta rodada.", invalid_bank_question: "Uma pergunta selecionada não está aprovada no acervo.",
    round_locked: "Esta rodada já começou ou possui tentativas e não pode mais ser alterada.", too_many_requests: "Muitas solicitações. Aguarde alguns minutos e tente novamente.",
  };
  if (result?.error === "round_schedule_conflict" && result.conflictingRound) {
    const format=(value:number)=>new Date(value).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
    return `Já existe uma rodada agendada nesse período: “${result.conflictingRound.title}”, de ${format(result.conflictingRound.opensAt)} até ${format(result.conflictingRound.closesAt)}. Escolha outro intervalo.`;
  }
  return messages[result?.error] || `Não foi possível salvar a rodada. Código de suporte: ${result?.supportId || "ROUND-UNEXPECTED"}.`;
}
