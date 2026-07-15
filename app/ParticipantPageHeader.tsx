"use client";

import { usePathname } from "next/navigation";

const supported = new Set(["/jornada", "/rankings", "/medalhas", "/perfil"]);

export function ParticipantPageHeader() {
  const path = usePathname();
  if (!supported.has(path)) return null;
  return (
    <header className="participant-section-header participant-section-header-global">
      <a href="/" aria-label="Ir para o início">
        <span aria-hidden="true">✦</span>
        <strong>CONTE OS FEITOS</strong>
      </a>
    </header>
  );
}
