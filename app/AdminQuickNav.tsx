"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const groups = [
  { label: "Visão geral", links: [["/admin", "Painel"], ["/", "Abrir aplicativo"], ["/admin/analises", "Análises"], ["/admin/relatorios", "Relatórios"]] },
  { label: "Comunidade", links: [["/admin/acessos", "Acessos"], ["/admin/membros", "Membros"], ["/admin/convites", "Convites"], ["/admin/comunicacao", "Comunicação"]] },
  { label: "Perguntas", links: [["/admin/perguntas", "Acervo"], ["/admin/perguntas/arquivadas", "Arquivadas"], ["/admin/perguntas/ia", "Sugestões IA"], ["/admin/perguntas/revisao", "Revisão"], ["/admin/perguntas/colaboracao", "Colaboração"], ["/admin/perguntas/importar", "Importar banco"], ["/admin/perguntas/base", "Base 100"]] },
  { label: "Rodadas", links: [["/admin/rodadas/lista", "Todas as rodadas"], ["/admin/rodadas", "Nova rodada"], ["/admin/rodadas/importar", "Importar rodada"], ["/admin/calendario", "Calendário"], ["/admin/temporadas", "Temporadas"]] },
  { label: "Gestão", links: [["/admin/permissoes", "Permissões"], ["/admin/historico", "Histórico"], ["/admin/privacidade", "Privacidade"], ["/admin/diagnostico", "Diagnóstico"]] },
];

export function AdminQuickNav() {
  const path = usePathname(), [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  if (!path.startsWith("/admin")) return null;
  return <><button className="admin-menu-toggle" aria-expanded={open} aria-controls="admin-side-menu" onClick={() => setOpen(!open)}><span>☰</span> Menu</button>{open && <button className="admin-menu-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)}/>}<aside id="admin-side-menu" className={`admin-side-menu ${open ? "open" : ""}`}><header><strong>CONTE OS FEITOS</strong><button onClick={() => setOpen(false)} aria-label="Fechar menu">×</button></header>{groups.map(group => <section key={group.label}><small>{group.label}</small>{group.links.map(([href, label]) => <a className={path === href ? "active" : ""} href={href} key={href}>{label}</a>)}</section>)}</aside></>;
}
