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
import "./free-play.css";
import "./wordle.css";
import "./game-sdk.css";
import "./three-clues.css";
import "./timeline.css";
import "./memory.css";
import "./theme-association.css";
import "./who-am-i.css";
import { AdminQuickNav } from "./AdminQuickNav";
import { BackNavigation } from "./BackNavigation";
import { LearningQuickNav } from "./LearningQuickNav";
import { AuthRecoveryLink } from "./AuthRecoveryLink";
import { PwaStatus } from "./PwaStatus";
import { ParticipantChrome } from "./ParticipantChrome";
import { AuthProvider } from "./AuthProvider";
import { PasswordVisibility } from "./PasswordVisibility";
import { GameNavigationProvider } from "./GameNavigationContext";

export const metadata: Metadata = {
  title: "Conte os Feitos — Jogos e Desafios Bíblicos",
  description: "Plataforma de jogos e desafios bíblicos para aprender de forma leve e divertida.",
  applicationName: "Conte os Feitos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Conte os Feitos" },
  icons: {
    icon: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AuthProvider><GameNavigationProvider><PasswordVisibility /><a className="skip-link" href="#main-content">Pular para o conteúdo</a><BackNavigation /><AdminQuickNav /><ParticipantChrome /><LearningQuickNav /><AuthRecoveryLink /><PwaStatus /><div id="main-content">{children}</div></GameNavigationProvider></AuthProvider></body></html>;
}
