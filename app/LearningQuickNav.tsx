"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { BrandIcon, participantNavigation } from "./navigation";

const participantRoutes = new Set(["/", "/jornada", "/rankings", "/medalhas", "/perfil"]);

export function LearningQuickNav() {
  const path = usePathname();
  const { user } = useAuth();
  if (!user || !participantRoutes.has(path)) return null;
  return <nav className="participant-bottom-nav" aria-label="Navegação principal">{participantNavigation.map(item => { const active = path === item.href; return <a key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><BrandIcon name={item.icon} /><span>{item.label}</span></a>; })}</nav>;
}
