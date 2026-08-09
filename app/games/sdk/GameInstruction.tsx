import type { ReactNode } from "react";

export function GameInstruction({ children, title = "Como jogar" }: {
  children: ReactNode;
  title?: string;
}) {
  return <aside className="game-sdk-instruction" aria-label={title}>
    <span aria-hidden="true">ⓘ</span>
    <div><strong>{title}</strong><p>{children}</p></div>
  </aside>;
}
