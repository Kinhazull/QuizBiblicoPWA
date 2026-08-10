import { UniversalContentArchive } from "../ContentCms";

export default function UniversalContentArchivePage() {
  return <main className="admin-shell content-cms-page">
    <section className="admin-title">
      <p className="eyebrow">CONTEÚDO</p>
      <h1>Acervo <em>Universal</em></h1>
      <p>Consulte conteúdos dos sete jogos e investigue sinais determinísticos de cobertura, diversidade, uso e disponibilidade.</p>
    </section>
    <UniversalContentArchive />
  </main>;
}
