import { EventWizard } from "./EventWizard";

export default function AdminEventsPage() {
  return <main className="admin-shell event-admin-shell">
    <section className="admin-title">
      <p className="eyebrow">PLATAFORMA</p>
      <h1>Editor visual de <em>eventos</em></h1>
      <p>Crie, revise e agende experiências usando os contratos seguros da plataforma.</p>
    </section>
    <EventWizard />
  </main>;
}
