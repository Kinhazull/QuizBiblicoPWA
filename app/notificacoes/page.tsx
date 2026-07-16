"use client";

import { useCallback, useEffect, useState } from "react";

export default function Notifications() {
  const [data, setData] = useState<any>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (response.status === 401) { location.href = "/"; return; }
    setData(await response.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function read(key: string, href?: string) {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    if (href) location.href = href; else await load();
  }
  async function readAll() {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    await load();
  }
  if (!data) return <main className="admin-shell"><p>Carregando avisos...</p></main>;
  const unreadText = data.unread === 1 ? "1 aviso ainda não lido." : data.unread > 1 ? `${data.unread} avisos ainda não lidos.` : "Você está em dia com os avisos.";
  return <main className="admin-shell notification-page">
    <section className="admin-title"><p className="eyebrow">AVISOS</p><h1>Suas <em>notificações</em></h1><p>{unreadText}</p></section>
    {data.unread > 0 && <button className="read-all" onClick={readAll}>MARCAR TODAS COMO LIDAS</button>}
    <section className="notification-list">
      {data.notifications.map((item: any) => <article key={item.key} className={`admin-panel ${item.read ? "read" : "unread"}`}><b>{item.icon}</b><div><small>{item.read ? "LIDO" : "NOVO"}</small><h2>{item.title}</h2><p>{item.message}</p></div><button onClick={() => read(item.key, item.href)}>ABRIR</button></article>)}
      {!data.notifications.length && <div className="admin-panel empty-notifications"><b>✓</b><h2>Nenhum aviso por enquanto</h2><p>Novas Jornadas, prazos e conquistas aparecerão aqui.</p></div>}
    </section>
  </main>;
}
