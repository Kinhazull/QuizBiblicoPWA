"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateGuess,
  isValidGuess,
  isWinningGuess,
  normalizeWord,
  WORDLE_LENGTH,
  WORDLE_MAX_ATTEMPTS,
  type LetterState,
} from "./engine";
import {
  createGameSessionId,
  GameLayout,
  recordPlatformGameCompletion,
  type GamePlayStatus,
} from "../sdk";
import {
  GameContentMode,
  gameContentRequestFromLocation,
  loadGameContent,
  validateGameContentAction,
  type LoadedGameContent,
} from "../loader";
import { GameType } from "../../../shared/content";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
type WordleContent = {
  id: string;
  version: number;
  word?: string;
  wordLength?: number;
  hint: string | null;
  biblicalReference: string | null;
};

function strongerState(current: LetterState | undefined, next: LetterState) {
  const weight: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 };
  return !current || weight[next] > weight[current] ? next : current;
}

export function WordleGame() {
  const sessionId = useRef(createGameSessionId());
  const currentGuessRef = useRef("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [message, setMessage] = useState("Digite uma palavra bíblica de cinco letras.");
  const [content, setContent] = useState<WordleContent | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<WordleContent> | null>(null);
  const [guessEvaluations, setGuessEvaluations] = useState<ReturnType<typeof evaluateGuess>[]>([]);
  const [contentState, setContentState] = useState<"loading" | "ready" | "error">("loading");
  const answer = content?.word ?? "";

  useEffect(() => {
    const controller = new AbortController();
    loadGameContent<WordleContent>({
      ...gameContentRequestFromLocation(GameType.WORDLE),
      signal: controller.signal,
    })
      .then(loaded => {
        const word = loaded.payload.word ? normalizeWord(loaded.payload.word) : undefined;
        const wordLength = word?.length ?? loaded.payload.wordLength;
        if (wordLength !== WORDLE_LENGTH) {
          throw new Error("wordle_content_invalid");
        }
        setLoadedContent(loaded);
        setContent({
          ...loaded.payload,
          id: loaded.contentId,
          version: loaded.contentVersion,
          word,
          wordLength,
        });
        setContentState("ready");
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setContentState("error");
        setMessage("Nenhum Wordle publicado está disponível no momento.");
      });
    return () => controller.abort();
  }, []);

  const keyboardState = useMemo(() => {
    const states: Record<string, LetterState> = {};
    for (const evaluation of guessEvaluations) {
      for (const item of evaluation) {
        states[item.letter] = strongerState(states[item.letter], item.state);
      }
    }
    return states;
  }, [guessEvaluations]);

  function addLetter(letter: string) {
    if (contentState !== "ready" || status !== "playing" || currentGuessRef.current.length >= WORDLE_LENGTH) return;
    currentGuessRef.current = `${currentGuessRef.current}${letter}`;
    setCurrentGuess(currentGuessRef.current);
    setMessage("Complete a palavra e confirme.");
  }

  function removeLetter() {
    if (contentState !== "ready" || status !== "playing") return;
    currentGuessRef.current = currentGuessRef.current.slice(0, -1);
    setCurrentGuess(currentGuessRef.current);
  }

  async function submitGuess() {
    if (!content || !loadedContent || contentState !== "ready" || status !== "playing") return;
    const submittedGuess = currentGuessRef.current;
    if (!isValidGuess(submittedGuess)) {
      setMessage(`A palavra precisa ter ${WORDLE_LENGTH} letras.`);
      return;
    }

    const normalized = normalizeWord(submittedGuess);
    const evaluation = loadedContent.mode === GameContentMode.DAILY || !answer
      ? await validateGameContentAction<{ evaluation: ReturnType<typeof evaluateGuess>; correct: boolean }>(
        loadedContent,
        "validate_guess",
        { guess: normalized },
      ).catch(() => null)
      : { evaluation: evaluateGuess(normalized, answer), correct: isWinningGuess(normalized, answer) };
    if (!evaluation) {
      setMessage("Não foi possível validar a palavra. Tente novamente.");
      return;
    }
    const nextGuesses = [...guesses, normalized];
    setGuesses(nextGuesses);
    setGuessEvaluations(current => [...current, evaluation.evaluation]);
    currentGuessRef.current = "";
    setCurrentGuess("");

    if (evaluation.correct) {
      setStatus("won");
      setMessage(`Você venceu em ${nextGuesses.length} tentativa${nextGuesses.length === 1 ? "" : "s"}!`);
      void recordPlatformGameCompletion({
        gameId: "wordle-biblico",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        guesses: nextGuesses,
      }).catch(() => undefined);
    } else if (nextGuesses.length === WORDLE_MAX_ATTEMPTS) {
      setStatus("lost");
      setMessage(answer ? `Fim de jogo. A palavra era ${answer}.` : "Fim de jogo. Tente novamente amanhã.");
      void recordPlatformGameCompletion({
        gameId: "wordle-biblico",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        guesses: nextGuesses,
      }).catch(() => undefined);
    } else {
      setMessage(`Tentativa ${nextGuesses.length} de ${WORDLE_MAX_ATTEMPTS}. Continue!`);
    }
  }

  function restart() {
    sessionId.current = createGameSessionId();
    currentGuessRef.current = "";
    setGuesses([]);
    setGuessEvaluations([]);
    setCurrentGuess("");
    setStatus("playing");
    setMessage("Digite uma palavra bíblica de cinco letras.");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") void submitGuess();
      else if (event.key === "Backspace") removeLetter();
      else if (/^[a-zA-Z]$/.test(event.key)) addLetter(event.key.toUpperCase());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const rows = Array.from({ length: WORDLE_MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const draft = rowIndex === guesses.length && status === "playing" ? currentGuess : "";
    const letters = submitted && guessEvaluations[rowIndex]
      ? guessEvaluations[rowIndex]
      : Array.from({ length: WORDLE_LENGTH }, (_, index) => ({ letter: draft[index] || "", state: undefined }));
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
      {contentState === "loading" && <p className="wordle-message" role="status">Carregando desafio publicado...</p>}
      {contentState === "error" && <p className="wordle-message lost" role="alert">{message}</p>}
      {contentState === "ready" && content?.hint && <p className="wordle-message">Dica: {content.hint}</p>}
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

      {contentState === "ready" && <p className={`wordle-message ${status}`} role="status" aria-live="polite">{message}</p>}

      {contentState === "ready" && status === "playing" && (
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
