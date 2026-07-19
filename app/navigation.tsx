import type { SVGProps } from "react";

export type IconName = "home" | "book" | "trophy" | "medal" | "user" | "bell" | "settings" | "users" | "questions" | "calendar" | "shield" | "chart" | "file" | "key" | "message" | "sparkles" | "review" | "upload" | "history" | "privacy" | "health" | "logout" | "chevron" | "menu";

export type NavigationItem = { label: string; href: string; icon: IconName; description?: string; permission?: string };
export type NavigationGroup = { label: string; icon: IconName; items: NavigationItem[] };

export const participantNavigation: NavigationItem[] = [
  { label: "Início", href: "/", icon: "home" },
  { label: "Jornada", href: "/jornada", icon: "book" },
  { label: "Ranking", href: "/rankings", icon: "trophy" },
  { label: "Medalhas", href: "/medalhas", icon: "medal" },
  { label: "Perfil", href: "/perfil", icon: "user" },
];

export const platformHomeNavigation: NavigationItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Jogos", href: "/jogos", icon: "questions" },
  { label: "Recompensas", href: "/#recompensas", icon: "medal" },
  { label: "Perfil", href: "/perfil", icon: "user" },
];

export const adminNavigation: NavigationGroup[] = [
  { label: "Visão geral", icon: "home", items: [
    { label: "Painel", href: "/admin", icon: "home", description: "Resumo da operação e pendências." },
    { label: "Indicadores", href: "/admin/analises", icon: "chart", description: "Acompanhar participação, resultados e desempenho." },
    { label: "Relatórios", href: "/admin/relatorios", icon: "file", description: "Exportar membros, resultados, ranking e auditoria." },
  ]},
  { label: "Comunidade", icon: "users", items: [
    { label: "Aprovações e acessos", href: "/admin/acessos", icon: "shield", description: "Aprovar cadastros, suspender usuários e revisar acessos." },
    { label: "Membros", href: "/admin/membros", icon: "users", description: "Gerenciar perfis, grupos e situações." },
    { label: "Convites", href: "/admin/convites", icon: "key", description: "Criar e acompanhar convites de cadastro." },
    { label: "Avisos e comunicados", href: "/admin/comunicacao", icon: "message", description: "Criar mensagens e notificações para os participantes." },
  ]},
  { label: "Perguntas", icon: "questions", items: [
    { label: "Banco de perguntas", href: "/admin/perguntas", icon: "questions", description: "Criar, localizar e organizar perguntas." },
    { label: "Perguntas arquivadas", href: "/admin/perguntas/arquivadas", icon: "file", description: "Consultar conteúdo preservado fora de uso." },
    { label: "Revisão de perguntas", href: "/admin/perguntas/revisao", icon: "review", description: "Revisar e aprovar perguntas do banco." },
    { label: "Revisão colaborativa", href: "/admin/perguntas/colaboracao", icon: "users", description: "Compartilhar perguntas e acompanhar contribuições." },
    { label: "Importar perguntas", href: "/admin/perguntas/importar", icon: "upload", description: "Adicionar perguntas em lote ao banco." },
    { label: "Base inicial", href: "/admin/perguntas/base", icon: "book", description: "Gerenciar a coleção bíblica inicial." },
  ]},
  { label: "Jornadas", icon: "calendar", items: [
    { label: "Gerenciar jornadas", href: "/admin/rodadas/lista", icon: "calendar", description: "Consultar e administrar jornadas." },
    { label: "Nova jornada", href: "/admin/rodadas", icon: "sparkles", description: "Montar uma jornada manualmente ou pelo banco." },
    { label: "Importar jornada", href: "/admin/rodadas/importar", icon: "upload", description: "Criar uma jornada a partir de texto estruturado." },
    { label: "Calendário", href: "/admin/calendario", icon: "calendar", description: "Visualizar a programação das jornadas." },
    { label: "Temporadas", href: "/admin/temporadas", icon: "trophy", description: "Planejar e acompanhar ciclos trimestrais." },
  ]},
  { label: "Gestão", icon: "shield", items: [
    { label: "Permissões", href: "/admin/permissoes", icon: "shield", description: "Definir responsabilidades administrativas." },
    { label: "Auditoria administrativa", href: "/admin/historico", icon: "history", description: "Consultar alterações e ações importantes do sistema." },
    { label: "Privacidade", href: "/admin/privacidade", icon: "privacy", description: "Atender solicitações e políticas de dados." },
    { label: "Diagnóstico", href: "/admin/diagnostico", icon: "health", description: "Verificar integridade e configuração do sistema." },
  ]},
];

const paths: Record<IconName, string> = {
  home: "M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z", book: "M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3zm16 0a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3z", trophy: "M8 4h8v5a4 4 0 0 1-8 0zM6 6H3v2a4 4 0 0 0 5 4M18 6h3v2a4 4 0 0 1-5 4M12 13v5M8 21h8M9 18h6", medal: "m8 3 4 7 4-7M7 3h10M16 10a6 6 0 1 1-8 0 6 6 0 0 1 8 0M12 13l1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 15.3l2-.3z", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0", bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4", settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1", users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", questions: "M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4M12 18h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", calendar: "M3 5h18v16H3zM16 3v4M8 3v4M3 10h18", shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4", chart: "M4 20V10M10 20V4M16 20v-7M22 20H2", file: "M5 2h10l4 4v16H5zM14 2v5h5M8 13h8M8 17h8", key: "M15 7a5 5 0 1 1-3.5 8.5L3 24v-4l3-3 2 2 2-2", message: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM8 9h8M8 13h5", sparkles: "m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8z", review: "M4 4h16v16H4zM8 9h8M8 13h5M8 17h3", upload: "M12 16V3M7 8l5-5 5 5M4 21h16", history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2", privacy: "M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4zM12 15v3", health: "M3 12h4l2-5 4 10 2-5h6", logout: "M10 17l5-5-5-5M15 12H3M14 3h6v18h-6", chevron: "m9 18 6-6-6-6", menu: "M4 6h16M4 12h16M4 18h16"
};

export function BrandIcon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
