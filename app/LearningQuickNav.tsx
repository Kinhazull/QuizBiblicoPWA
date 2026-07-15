"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandIcon, participantNavigation } from "./navigation";
const participantRoutes = new Set(["/", "/jornada", "/rankings", "/medalhas", "/perfil"]);
export function LearningQuickNav() {
  const path = usePathname(), [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { let stopped=false; const check=()=>fetch("/api/auth/me", { cache: "no-store" }).then(r => !stopped&&setAuthenticated(r.ok)).catch(() => !stopped&&setAuthenticated(false)); check(); const timer=setInterval(check,800); return()=>{stopped=true;clearInterval(timer)}; }, [path]);
  if (!authenticated || !participantRoutes.has(path)) return null;
  return <nav className="participant-bottom-nav" aria-label="Navegação principal">{participantNavigation.map(item => { const active = path === item.href; return <a key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><BrandIcon name={item.icon} /><span>{item.label}</span></a>; })}</nav>;
}
