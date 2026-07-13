"use client";
import { usePathname } from "next/navigation";
export function AdminQuickNav(){const path=usePathname();if(!path.startsWith("/admin"))return null;return <nav className="admin-quick-nav" aria-label="Menu administrativo"><a href="/admin">Acessos</a><a href="/admin/membros">Membros</a><a href="/admin/convites">Convites</a><a href="/admin/rodadas/lista">Rodadas</a><a href="/admin/rodadas">Nova</a><a href="/admin/rodadas/importar">Importar</a></nav>}
