import { UniversalContentArchive } from "../ContentCms";

export default function UniversalContentArchivePage() {
  return <main className="admin-shell content-cms-page">
    <section className="admin-title">
      <p className="eyebrow">CONTEÚDO</p>
      <h1>Acervo <em>Universal</em></h1>
      <p>Consulte conteúdos de todos os jogos. Nesta etapa, somente o Quiz possui persistência integrada.</p>
    </section>
    <UniversalContentArchive />
  </main>;
}
