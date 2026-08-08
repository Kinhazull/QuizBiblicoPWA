import { ContentDashboard, QuizCatalogDiagnostics } from "./ContentCms";
import { OfficialBaseContentImport } from "./OfficialBaseContentImport";
import { UniversalContentImport } from "./UniversalContentImport";

export default function ContentDashboardPage() {
  return <main className="admin-shell content-cms-page">
    <section className="admin-title">
      <p className="eyebrow">CONTEÚDO</p>
      <h1>Central de <em>conteúdo</em></h1>
      <p>Acompanhe o acervo editorial da plataforma sem alterar os fluxos operacionais do Quiz.</p>
    </section>
    <ContentDashboard />
    <OfficialBaseContentImport />
    <UniversalContentImport />
    <QuizCatalogDiagnostics />
    <section className="content-shortcuts admin-panel" aria-labelledby="content-shortcuts-title">
      <header><div><p className="eyebrow">ATALHOS OPERACIONAIS</p><h2 id="content-shortcuts-title">Ferramentas existentes</h2></div></header>
      <nav>
        <a href="/admin/conteudo/assets">Assets<span>Gerenciar imagens, icones e banners</span></a>
        <a href="/admin/conteudo/acervo">Acervo Universal<span>Consultar conteúdo persistido</span></a>
        <a href="/admin/perguntas/revisao">Revisão do Quiz<span>Avaliar perguntas pendentes</span></a>
        <a href="/admin/perguntas/importar">Importação do Quiz<span>Adicionar perguntas em lote</span></a>
        <a href="/admin/perguntas/colaboracao">Colaboração e versões<span>Acompanhar contribuições atuais</span></a>
        <a href="/admin/perguntas/base">Base inicial<span>Consultar a coleção bíblica inicial</span></a>
        <a href="/admin/perguntas/arquivadas">Arquivados legados<span>Acessar a área operacional existente</span></a>
      </nav>
    </section>
  </main>;
}
