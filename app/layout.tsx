import type { Metadata } from "next";
import "./globals.css";
import "./medals.css";
import "./status.css";
import "./back-navigation.css";
import "./profile.css";
import "./navigation-cleanup.css";
import "./journey.css";
import "./notifications.css";
import "./legal.css";
import "./brand-system.css";
import "./quality.css";
import "./platform-home.css";
import "./games.css";
import { AdminQuickNav } from "./AdminQuickNav";
import { BackNavigation } from "./BackNavigation";
import { LearningQuickNav } from "./LearningQuickNav";
import { AuthRecoveryLink } from "./AuthRecoveryLink";
import { PwaStatus } from "./PwaStatus";
import { ParticipantChrome } from "./ParticipantChrome";
import { AuthProvider } from "./AuthProvider";
import { PasswordVisibility } from "./PasswordVisibility";

export const metadata: Metadata = {
  title: "Contem o que Deus fez — Quiz Bíblico",
  description: "Quiz bíblico sobre testemunhos, milagres e os feitos de Deus.",
  applicationName: "Conte os Feitos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Conte os Feitos" },
  icons: {
    icon: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AuthProvider><PasswordVisibility /><a className="skip-link" href="#main-content">Pular para o conteúdo</a><BackNavigation /><AdminQuickNav /><ParticipantChrome /><LearningQuickNav /><AuthRecoveryLink /><PwaStatus /><div id="main-content">{children}</div></AuthProvider></body></html>;
}
