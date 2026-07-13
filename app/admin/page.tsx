"use client";

import { useEffect, useState } from "react";

const groups = [
  { title: "Comunidade", description: "Participantes, convites e comunicação.", links: [["/admin/acessos","Acessos"],["/admin/membros","Membros"],["/admin/convites","Convites"],["/admin/comunicacao","Comunicação"]] },
  { title: "Perguntas", description: "Acervo, criação, revisão e colaboração.", links: [["/admin/perguntas","Banco de perguntas"],["/admin/perguntas/ia","Sugestões IA"],["/admin/perguntas/revisao","Revisão"],["/admin/perguntas/colaboracao","Colaboração"],["/admin/perguntas/importar","Importar banco"]] },
  { title: "Rodadas", description: "Planejamento, calendário e temporadas.", links: [["/admin/rodadas/lista","Todas as rodadas"],["/admin/rodadas","Nova rodada"],["/admin/rodadas/importar","Importar rodada"],["/admin/calendario","Calendário"],["/admin/temporadas","Temporadas"]] },
  { title: "Gestão", description: "Indicadores, segurança e configurações.", links: [["/admin/analises","Análises"],["/admin/relatorios","Relatórios"],["/admin/permissoes","Permissões"],["/admin/historico","Histórico"],["/admin/diagnostico","Diagnóstico"]] }
];

export default function AdminHub(){
  const [summary,setSummary]=useState({pending:0,members:0,rounds:0});
  useEffect(()=>{Promise.all([fetch('/api/admin/users'),fetch('/api/admin/rounds')]).then(async([u,r])=>{
    if(u.status===401||u.status===403){location.href='/';return}
    const users=u.ok?(await u.json()).users||[]:[],rounds=r.ok?(await r.json()).rounds||[]:[];
    setSummary({pending:users.filter((x:any)=>x.status==='pending').length,members:users.filter((x:any)=>x.status==='active').length,rounds:rounds.length});
  }).catch(()=>{})},[]);
  return <main className="admin-shell admin-hub">
    <section className="admin-title"><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>Central de <em>gestão</em></h1><p>Acompanhe o que precisa de atenção e acesse rapidamente cada área.</p></section>
    <section className="hub-summary"><a href="/admin/acessos"><small>APROVAÇÕES PENDENTES</small><strong>{summary.pending}</strong><span>Revisar acessos →</span></a><a href="/admin/membros"><small>MEMBROS ATIVOS</small><strong>{summary.members}</strong><span>Gerenciar comunidade →</span></a><a href="/admin/rodadas/lista"><small>RODADAS CADASTRADAS</small><strong>{summary.rounds}</strong><span>Abrir rodadas →</span></a><a href="/admin/diagnostico"><small>SAÚDE DO SISTEMA</small><strong>✓</strong><span>Executar diagnóstico →</span></a></section>
    <section className="hub-groups">{groups.map(group=><article className="admin-panel" key={group.title}><header><h2>{group.title}</h2><p>{group.description}</p></header><nav>{group.links.map(([href,label])=><a href={href} key={href}>{label}<span>→</span></a>)}</nav></article>)}</section>
  </main>
}
