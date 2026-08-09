import type { ReactNode } from "react";

export type GameFeedbackTone = "success" | "error" | "info" | "warning";
const ICONS: Record<GameFeedbackTone, string> = { success: "✓", error: "!", info: "i", warning: "!" };

export function GameFeedback({ children, tone = "info", assertive = false }: {
  children: ReactNode;
  tone?: GameFeedbackTone;
  assertive?: boolean;
}) {
  return <div className={`game-sdk-feedback ${tone}`} role={assertive ? "alert" : "status"}
    aria-live={assertive ? "assertive" : "polite"}>
    <span aria-hidden="true">{ICONS[tone]}</span><p>{children}</p>
  </div>;
}
