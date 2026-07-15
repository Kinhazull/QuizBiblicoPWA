"use client";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "./LogoutButton";
import { BrandIcon } from "./navigation";
type Account = { displayName: string; role: string };

export function AccountMenu({ user: supplied, compact = false }: { user?: Account; compact?: boolean }) {
  const [user, setUser] = useState<Account | null>(supplied || null), [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!supplied) fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => data?.user && setUser(data.user)).catch(() => {}); }, [supplied]);
  useEffect(() => { const close = (event: KeyboardEvent | MouseEvent) => { if (event instanceof KeyboardEvent && event.key === "Escape") setOpen(false); if (event instanceof MouseEvent && root.current && !root.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("keydown", close); document.addEventListener("mousedown", close); return () => { document.removeEventListener("keydown", close); document.removeEventListener("mousedown", close); }; }, []);
  if (!user) return null;
  return <div className={`account-menu ${compact ? "compact" : ""}`} ref={root}><button type="button" className="account-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><span className="account-avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</span><span className="account-name">{user.displayName}</span><BrandIcon name="chevron" /></button>{open && <div className="account-popover" role="menu"><a role="menuitem" href="/perfil"><BrandIcon name="user" /> Meu perfil</a><a role="menuitem" href="/privacidade/conta"><BrandIcon name="settings" /> Configurações</a>{["admin", "leader"].includes(user.role) && <a role="menuitem" href="/admin"><BrandIcon name="shield" /> Abrir painel administrativo</a>}<LogoutButton /></div>}</div>;
}
