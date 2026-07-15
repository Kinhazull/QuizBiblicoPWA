"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";
import { BrandIcon } from "./navigation";
export function ParticipantChrome() {
  const path = usePathname(), [user, setUser] = useState<any>(null), [unread, setUnread] = useState(0);
  useEffect(() => { if (path !== "/") return; fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (data?.user) { setUser(data.user); fetch("/api/notifications", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(n => n && setUnread(Number(n.unread || 0))).catch(() => {}); } }).catch(() => {}); }, [path]);
  if (path !== "/" || !user) return null;
  return <div className="participant-chrome"><a className="participant-icon-action notifications-action" href="/notificacoes" aria-label={unread ? `${unread} avisos não lidos` : "Avisos"}><BrandIcon name="bell" />{unread > 0 && <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</a><div className="participant-account"><AccountMenu user={user} compact /><a className="participant-icon-action settings-action" href="/privacidade/conta" aria-label="Configurações" title="Configurações"><BrandIcon name="settings" /></a></div></div>;
}
