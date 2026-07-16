"use client";
import { useCallback, useEffect, useState } from "react";
const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date()),
    [data, setData] = useState<any>({
      rounds: [],
      seasons: [],
      conflictIds: [],
    });
  const year = cursor.getFullYear(),
    month = cursor.getMonth(),
    first = new Date(year, month, 1),
    start = new Date(year, month, 1 - first.getDay()),
    days = Array.from(
      { length: 42 },
      (_, index) =>
        new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + index,
        ),
    );
  const load = useCallback(async () => {
    const from = new Date(year, month, 1).getTime(),
      to = new Date(year, month + 1, 1).getTime() - 1;
    const response = await fetch(`/api/admin/calendar?from=${from}&to=${to}`);
    if (!response.ok) {
      location.href = "/admin";
      return;
    }
    setData(await response.json());
  }, [year, month]);
  useEffect(() => {
    load();
  }, [load]);
  const dayRounds = (date: Date) =>
    data.rounds.filter((round: any) => {
      const local = new Date(round.opens_at).toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      });
      return (
        local ===
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      );
    });
  return (
    <main className="admin-shell">
      <section className="admin-title">
        <p className="eyebrow">PLANEJAMENTO</p>
        <h1>
          Calendário de <em>rodadas</em>
        </h1>
        <p>
          {data.seasons[0]?.title || "Nenhuma temporada neste período"}
          {data.conflictIds.length
            ? ` · ${data.conflictIds.length} rodada(s) em conflito`
            : ""}
        </p>
      </section>
      <nav className="calendar-nav">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}>
          ←
        </button>
        <h2>
          {months[month]} de {year}
        </h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}>
          →
        </button>
      </nav>
      <section className="calendar-grid">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
          <b className="weekday" key={label}>
            {label}
          </b>
        ))}
        {days.map((date) => (
          <article
            className={date.getMonth() === month ? "" : "outside"}
            key={date.toISOString()}
          >
            <span>{date.getDate()}</span>
            {dayRounds(date).map((round: any) => (
              <a
                className={`${round.round_type} ${data.conflictIds.includes(round.id) ? "conflict" : ""}`}
                href={`/admin/rodadas/detalhes?id=${round.id}`}
                key={round.id}
              >
                <small>
                  {new Date(round.opens_at).toLocaleTimeString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
                {round.title}
              </a>
            ))}
          </article>
        ))}
      </section>
      <p className="calendar-legend">
        <span>● Regular</span>
        <span>★ Evento especial</span>
        <span className="conflict">! Conflito de horário</span>
      </p>
    </main>
  );
}
