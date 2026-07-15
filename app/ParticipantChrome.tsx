"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandIcon } from "./navigation";
export function ParticipantChrome() {
  const path = usePathname(), [user, setUser] = useState<any>(null), [unread, setUnread] = useState(0);
  useEffect(() => { if (path !== "/") return; let stopped = false; const check = () => fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (stopped) return; setUser(data?.user || null); if (data?.user) fetch("/api/notifications", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(n => !stopped && n && setUnread(Number(n.unread || 0))).catch(() => {}); }).catch(() => !stopped && setUser(null)); check(); const timer = setInterval(check, 800); return () => { stopped = true; clearInterval(timer); }; }, [path]);
  if (path !== "/" || !user) return null;
  return <div className="participant-chrome"><a className="participant-icon-action notifications-action" href="/notificacoes" aria-label={unread ? `${unread} avisos não lidos` : "Avisos"}><BrandIcon name="bell" />{unread > 0 && <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</a>{["admin", "leader"].includes(user.role) && <a className="participant-icon-action settings-action" href="/admin" aria-label="Abrir painel administrativo" title="Abrir painel administrativo"><BrandIcon name="settings" /></a>}</div>;
}
