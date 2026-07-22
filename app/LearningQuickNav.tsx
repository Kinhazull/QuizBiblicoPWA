"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { BrandIcon, participantNavigation, platformHomeNavigation } from "./navigation";

const participantRoutes = new Set(["/", "/jornada", "/rankings", "/medalhas", "/perfil"]);

export function LearningQuickNav() {
  const path = usePathname();
  const { user } = useAuth();
  const platformRoute = path === "/" || path === "/jogos" || path.startsWith("/jogos/");
  if (!user || (!participantRoutes.has(path) && !platformRoute)) return null;
  const items = platformRoute ? platformHomeNavigation : participantNavigation;
  return <nav className={`participant-bottom-nav ${platformRoute ? "platform-bottom-nav" : ""}`} aria-label="Navegação principal">{items.map(item => {
    const active = item.href === "/" ? path === "/" : item.href === "/jogos" ? path === "/jogos" || path.startsWith("/jogos/") : path === item.href;
    return <a key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><BrandIcon name={item.icon} /><span>{item.label}</span></a>;
  })}</nav>;
}
