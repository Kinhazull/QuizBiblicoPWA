"use client";

import { useEffect, useMemo, useState } from "react";
import {
  evaluateGuess,
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_LENGTH,
  WORDLE_MAX_ATTEMPTS,
  WORDLE_TEMPORARY_ANSWER,
  type LetterState,
} from "./engine";
import { GameLayout, type GamePlayStatus } from "../sdk";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function strongerState(current: LetterState | undefined, next: LetterState) {
  const weight: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 };
  return !current || weight[next] > weight[current] ? next : current;
}

export function WordleGame() {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [message, setMessage] = useState("Digite uma palavra bíblica de cinco letras.");

  const keyboardState = useMemo(() => {
    const states: Record<string, LetterState> = {};
    for (const guess of guesses) {
      for (const item of evaluateGuess(guess, WORDLE_TEMPORARY_ANSWER)) {
        states[item.letter] = strongerState(states[item.letter], item.state);
      }
    }
    return states;
  }, [guesses]);

  function addLetter(letter: string) {
    if (status !== "playing" || currentGuess.length >= WORDLE_LENGTH) return;
    setCurrentGuess(value => `${value}${letter}`);
    setMessage("Complete a palavra e confirme.");
  }

  function removeLetter() {
    if (status !== "playing") return;
    setCurrentGuess(value => value.slice(0, -1));
  }

  function submitGuess() {
    if (status !== "playing") return;
    if (!isValidGuess(currentGuess)) {
      setMessage(`A palavra precisa ter ${WORDLE_LENGTH} letras.`);
      return;
    }

    const normalized = normalizeWord(currentGuess);
    const nextGuesses = [...guesses, normalized];
    setGuesses(nextGuesses);
    setCurrentGuess("");

    if (isWinningGuess(normalized, WORDLE_TEMPORARY_ANSWER)) {
      setStatus("won");
      setMessage(`Você venceu em ${nextGuesses.length} tentativa${nextGuesses.length === 1 ? "" : "s"}!`);
    } else if (nextGuesses.length === WORDLE_MAX_ATTEMPTS) {
      setStatus("lost");
      setMessage(`Fim de jogo. A palavra era ${WORDLE_TEMPORARY_ANSWER}.`);
    } else {
      setMessage(`Tentativa ${nextGuesses.length} de ${WORDLE_MAX_ATTEMPTS}. Continue!`);
    }
  }

  function restart() {
    setGuesses([]);
    setCurrentGuess("");
    setStatus("playing");
    setMessage("Digite uma palavra bíblica de cinco letras.");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") submitGuess();
      else if (event.key === "Backspace") removeLetter();
      else if (/^[a-zA-Z]$/.test(event.key)) addLetter(event.key.toUpperCase());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const rows = Array.from({ length: WORDLE_MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const draft = rowIndex === guesses.length && status === "playing" ? currentGuess : "";
    const letters = submitted ? evaluateGuess(submitted, WORDLE_TEMPORARY_ANSWER) : Array.from({ length: WORDLE_LENGTH }, (_, index) => ({ letter: draft[index] || "", state: undefined }));
    return { submitted: Boolean(submitted), letters };
  });

  return (
    <GameLayout
      eyebrow="Desafio de palavras"
      title="Wordle"
      highlightedTitle="Bíblico"
      description="Descubra a palavra em até seis tentativas."
      status={status}
      currentAttempt={status === "playing" ? guesses.length + 1 : guesses.length}
      maxAttempts={WORDLE_MAX_ATTEMPTS}
      onRestart={restart}
    >
      <section className="wordle-game" aria-label="Wordle Bíblico">
      <div className="wordle-board" aria-label="Tabuleiro do Wordle Bíblico">
        {rows.map((row, rowIndex) => (
          <div className="wordle-row" key={rowIndex} aria-label={`Tentativa ${rowIndex + 1}`}>
            {row.letters.map((item, letterIndex) => (
              <span className={`wordle-cell ${row.submitted ? item.state : ""} ${item.letter ? "filled" : ""}`} key={letterIndex} aria-label={row.submitted ? `${item.letter}: ${item.state === "correct" ? "correta" : item.state === "present" ? "presente" : "ausente"}` : item.letter || "vazia"}>
                {item.letter}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p className={`wordle-message ${status}`} role="status" aria-live="polite">{message}</p>

      {status === "playing" && (
        <div className="wordle-keyboard" aria-label="Teclado virtual">
          {KEYBOARD_ROWS.map((row, index) => (
            <div className="wordle-keyboard-row" key={row}>
              {index === 2 && <button className="wordle-key wide" type="button" onClick={submitGuess}>Enter</button>}
              {[...row].map(letter => <button className={`wordle-key ${keyboardState[letter] || ""}`} type="button" onClick={() => addLetter(letter)} key={letter} aria-label={`Letra ${letter}`}>{letter}</button>)}
              {index === 2 && <button className="wordle-key wide" type="button" onClick={removeLetter} aria-label="Apagar letra">⌫</button>}
            </div>
          ))}
        </div>
      )}

      <div className="wordle-legend" aria-label="Legenda">
        <span><i className="correct" />Correta</span>
        <span><i className="present" />Presente</span>
        <span><i className="absent" />Ausente</span>
      </div>
      </section>
    </GameLayout>
  );
}
