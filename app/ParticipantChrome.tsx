"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { BrandIcon } from "./navigation";

export function ParticipantChrome() {
  const path = usePathname();
  const { user, unreadNotifications: unread, refreshNotifications } = useAuth();

  useEffect(() => {
    if (path === "/" && user) void refreshNotifications();
  }, [path, user, refreshNotifications]);

  if (path !== "/" || !user) return null;
  return <div className="participant-chrome"><a className="participant-icon-action notifications-action" href="/notificacoes" aria-label={unread ? `${unread} avisos não lidos` : "Avisos"}><BrandIcon name="bell" />{unread > 0 && <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</a>{["admin", "leader"].includes(user.role) && <a className="participant-icon-action settings-action" href="/admin" aria-label="Abrir painel administrativo" title="Abrir painel administrativo"><BrandIcon name="settings" /></a>}</div>;
}
