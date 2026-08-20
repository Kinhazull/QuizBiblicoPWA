"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LEGACY_ROUTE_DESTINATIONS: Record<string, string> = {
  "/temporadas": "/recompensas",
  "/revisao-inteligente": "/jogos",
  "/admin/perguntas": "/admin/conteudo",
  "/admin/perguntas/base": "/admin/conteudo",
  "/admin/perguntas/revisao": "/admin/conteudo/acervo",
  "/admin/perguntas/importar": "/admin/conteudo",
  "/admin/perguntas/arquivadas": "/admin/conteudo/acervo?status=ARCHIVED",
  "/admin/perguntas/colaboracao": "/admin/conteudo/acervo",
  "/admin/perguntas/duplicadas": "/admin/conteudo/acervo",
  "/admin/rodada1": "/admin/eventos",
  "/admin/rodadas": "/admin/eventos",
  "/admin/rodadas/lista": "/admin/eventos",
  "/admin/rodadas/importar": "/admin/eventos",
  "/admin/rodadas/detalhes": "/admin/eventos",
  "/admin/temporadas": "/admin/calendario",
  "/admin/temporadas/detalhes": "/admin/calendario",
};

export function LegacyRouteRedirects() {
  const pathname = usePathname();

  useEffect(() => {
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    const destination = LEGACY_ROUTE_DESTINATIONS[normalizedPath];
    if (destination) location.replace(destination);
  }, [pathname]);

  return null;
}
