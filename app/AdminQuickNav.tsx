"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { adminNavigation, BrandIcon } from "./navigation";
import { visibleAdminNavigation } from "./admin-navigation-access";
import { useAuth } from "./AuthProvider";

const cleanPath = (value: string) => value !== "/" ? value.replace(/\/+$/, "") : value;
const activeHref = (path: string) => { const normalized=cleanPath(path); const exact=adminNavigation.flatMap(group=>group.items).find(item=>!item.disabled&&cleanPath(item.href)===normalized); if(exact)return exact.href; const candidates=adminNavigation.flatMap(group=>group.items).filter(item=>!item.disabled&&item.href!=="/admin"&&normalized.startsWith(`${cleanPath(item.href)}/`)).sort((a,b)=>b.href.length-a.href.length); return candidates[0]?.href||""; };

export function AdminQuickNav() {
  const path = usePathname(), toggleRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const navigation = useMemo(() => visibleAdminNavigation(adminNavigation, user), [user]);
  const selected=useMemo(()=>activeHref(path),[path]);
  const current = useMemo(() => adminNavigation.find(group => group.items.some(item => item.href===selected))?.label || "Visão geral", [selected]);
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState<Record<string, boolean>>({ [current]: true });
  function close(restore = false) { setOpen(false); if (restore) requestAnimationFrame(() => toggleRef.current?.focus()); }
  useEffect(() => { setExpanded(value => ({ ...value, [current]: true })); close(); }, [path, current]);
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && open) close(true); }; document.addEventListener("keydown", escape); document.body.classList.toggle("admin-menu-open", open); return () => { document.removeEventListener("keydown", escape); document.body.classList.remove("admin-menu-open"); }; }, [open]);
  if (!path.startsWith("/admin")) return null;
  return <>
    <header className="admin-brand-header"><a className="admin-brand-link" href="/admin"><span>✦</span><strong>CONTE OS FEITOS</strong><small>Central de gestão</small></a></header>
    <button ref={toggleRef} type="button" className="admin-menu-toggle" aria-label="Abrir menu administrativo" aria-expanded={open} aria-controls="admin-side-menu" onClick={() => setOpen(value => !value)}><BrandIcon name="menu" /><span>Menu</span></button>
    {open && <button type="button" className="admin-menu-backdrop" aria-label="Fechar menu administrativo" onClick={() => close(true)} />}
    <aside id="admin-side-menu" className={`admin-side-menu ${open ? "open" : ""}`} aria-label="Navegação administrativa">
      <div className="admin-drawer-heading"><strong>Navegação</strong><button type="button" onClick={() => close(true)} aria-label="Fechar menu">×</button></div>
      <a className="admin-open-app" href="/"><BrandIcon name="home" /> Abrir aplicativo</a>
      {navigation.map(group => { const groupOpen = Boolean(expanded[group.label]); return <section className="admin-nav-group" key={group.label}><button type="button" className="admin-nav-group-toggle" aria-expanded={groupOpen} onClick={() => setExpanded(value => ({ ...value, [group.label]: !groupOpen }))}><BrandIcon name={group.icon} /><span>{group.label}</span><BrandIcon name="chevron" /></button>{groupOpen && <nav aria-label={group.label}>{group.items.map(item => { const active = item.href===selected; return item.disabled ? <span className="admin-nav-disabled" key={`${group.label}:${item.label}`} aria-disabled="true" title={item.description}><BrandIcon name={item.icon} /><span>{item.label}<small>Em breve</small></span></span> : <a href={item.href} key={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} title={item.description}><BrandIcon name={item.icon} /><span>{item.label}</span></a>; })}{group.items.length === 0 && group.emptyLabel && <span className="admin-nav-empty">{group.emptyLabel}</span>}</nav>}</section>; })}
    </aside>
  </>;
}
