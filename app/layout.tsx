import type { Metadata } from "next";
import "./globals.css";
import "./admin-extra.css";
import "./admin-quality.css";
import "./medals.css";
import "./status.css";
import "./back-navigation.css";
import "./import.css";
import "./management.css";
import "./profile.css";
import "./members.css";
import "./admin-nav.css";
import "./admin-hub.css";
import "./navigation-cleanup.css";
import "./round-details.css";
import "./reports.css";
import "./journey.css";
import "./notifications.css";
import "./legal.css";
import "./question-bank.css";
import "./question-picker.css";
import "./question-import.css";
import "./question-pagination.css";
import "./question-compose.css";
import "./permissions.css";
import "./review.css";
import "./collaboration.css";
import "./calendar.css";
import "./round-rules.css";
import "./analytics.css";
import "./ai.css";
import "./batch.css";
import "./members-batch.css";
import "./quality.css";
import "./seasons.css";
import "./brand-system.css";
import { AdminQuickNav } from "./AdminQuickNav";
import { BackNavigation } from "./BackNavigation";
import { LearningQuickNav } from "./LearningQuickNav";
import { AuthRecoveryLink } from "./AuthRecoveryLink";
import { PwaStatus } from "./PwaStatus";
import { ParticipantChrome } from "./ParticipantChrome";
import { AuthProvider } from "./AuthProvider";

export const metadata: Metadata = {
  title: "Contem o que Deus fez — Quiz Bíblico",
  description: "Quiz bíblico sobre testemunhos, milagres e os feitos de Deus.",
  applicationName: "Conte os Feitos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Conte os Feitos" },
  icons: { icon: "/app-icon.svg", apple: "/app-icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AuthProvider><a className="skip-link" href="#main-content">Pular para o conteúdo</a><BackNavigation /><AdminQuickNav /><ParticipantChrome /><LearningQuickNav /><AuthRecoveryLink /><PwaStatus /><div id="main-content">{children}</div></AuthProvider></body></html>;
}
