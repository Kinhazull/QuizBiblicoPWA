import { GameHud } from "./GameHud";
import { GameResult } from "./GameResult";
import type { GameLayoutProps } from "./types";

export function GameLayout({
  eyebrow,
  title,
  highlightedTitle,
  description,
  status,
  currentAttempt,
  maxAttempts,
  progressLabel,
  gameType,
  mode,
  onRestart,
  children,
}: GameLayoutProps) {
  return <main className="game-sdk-page">
    <div className="game-sdk-ambient game-sdk-ambient-one" aria-hidden="true" />
    <div className="game-sdk-ambient game-sdk-ambient-two" aria-hidden="true" />
    <section className="game-sdk-shell">
      <header className="game-sdk-heading">
        <p>{eyebrow}</p>
        <h1>{title} {highlightedTitle && <em>{highlightedTitle}</em>}</h1>
        <span>{description}</span>
      </header>
      <GameHud status={status} currentAttempt={currentAttempt} maxAttempts={maxAttempts} progressLabel={progressLabel} />
      <div className="game-sdk-content">{children}</div>
      {status !== "playing"
        ? <GameResult status={status} gameType={gameType} mode={mode} onRestart={onRestart} />
        : null}
    </section>
  </main>;
}
