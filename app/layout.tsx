import type { Metadata } from "next";
import "./globals.css";
import "./admin-extra.css";
import "./medals.css";
import "./status.css";
import "./back-navigation.css";
import "./import.css";
import "./management.css";
import "./profile.css";
import "./members.css";
import "./admin-nav.css";
import { AdminQuickNav } from "./AdminQuickNav";
import { BackNavigation } from "./BackNavigation";

export const metadata: Metadata = {
  title: "Contem o que Deus fez — Quiz Bíblico",
  description: "Quiz bíblico sobre testemunhos, milagres e os feitos de Deus.",
  applicationName: "Conte os Feitos",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Conte os Feitos" },
  icons: { icon: "/app-icon.svg", apple: "/app-icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><BackNavigation /><AdminQuickNav />{children}</body></html>;
}
