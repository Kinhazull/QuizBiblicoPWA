"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  evaluateGuess,
  isSupportedWordLength,
  isValidGuess,
  normalizeWord,
  WORDLE_MIN_LENGTH,
  WORDLE_MAX_ATTEMPTS,
  type LetterState,
} from "./engine";
import {
  createGameSessionId,
  GameInstruction,
  GameLayout,
  recordPlatformGameCompletion,
  type GamePlayStatus,
} from "../sdk";
import {
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
  const currentGuessRef = useRef<string[]>([]);
  const submittingRef = useRef(false);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState(0);
  const [status, setStatus] = useState<GamePlayStatus>("playing");
  const [message, setMessage] = useState("Preparando o desafio de palavras…");
  const [content, setContent] = useState<WordleContent | null>(null);
  const [loadedContent, setLoadedContent] = useState<LoadedGameContent<WordleContent> | null>(null);
  const [guessEvaluations, setGuessEvaluations] = useState<ReturnType<typeof evaluateGuess>[]>([]);
  const [contentState, setContentState] = useState<"loading" | "ready" | "error">("loading");
  const answer = content?.word ?? "";
  const wordLength = content?.wordLength ?? WORDLE_MIN_LENGTH;

  useEffect(() => {
    const controller = new AbortController();
    loadGameContent<WordleContent>({
      ...gameContentRequestFromLocation(GameType.WORDLE),
      signal: controller.signal,
    })
      .then(loaded => {
        const word = loaded.payload.word ? normalizeWord(loaded.payload.word) : undefined;
        const wordLength = word?.length ?? loaded.payload.wordLength;
        if (!wordLength || !isSupportedWordLength(wordLength)) {
          throw new Error("wordle_content_invalid");
        }
        currentGuessRef.current = Array.from({ length: wordLength }, () => "");
        setCurrentGuess([...currentGuessRef.current]);
        setSelectedCell(0);
        setLoadedContent(loaded);
        setContent({
          ...loaded.payload,
          id: loaded.contentId,
          version: loaded.contentVersion,
          word,
          wordLength,
        });
        setMessage(`Digite uma palavra de ${wordLength} letras. Você pode escolher qualquer posição.`);
        setContentState("ready");
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setContentState("error");
        setMessage("Estamos preparando novas palavras. Tente novamente em instantes.");
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
    if (contentState !== "ready" || status !== "playing") return;
    const cells = [...currentGuessRef.current];
    cells[selectedCell] = normalizeWord(letter).slice(0, 1);
    currentGuessRef.current = cells;
    setCurrentGuess(cells);
    const nextEmpty = cells.findIndex((value, index) => index > selectedCell && !value);
    const anyEmpty = cells.findIndex(value => !value);
    setSelectedCell(nextEmpty >= 0 ? nextEmpty : anyEmpty >= 0 ? anyEmpty : selectedCell);
    setMessage("Complete a palavra e confirme.");
  }

  function removeLetter() {
    if (contentState !== "ready" || status !== "playing") return;
    const cells = [...currentGuessRef.current];
    if (cells[selectedCell]) {
      cells[selectedCell] = "";
    } else if (selectedCell > 0) {
      cells[selectedCell - 1] = "";
      setSelectedCell(selectedCell - 1);
    }
    currentGuessRef.current = cells;
    setCurrentGuess(cells);
  }

  async function submitGuess() {
    if (!content || !loadedContent || contentState !== "ready" || status !== "playing") return;
    const submittedGuess = currentGuessRef.current.join("");
    if (!isValidGuess(submittedGuess, wordLength) || currentGuessRef.current.some(letter => !letter)) {
      setMessage(`Preencha todas as ${wordLength} letras antes de confirmar.`);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    const normalized = normalizeWord(submittedGuess);
    let validationError = "";
    const evaluation = await validateGameContentAction<{ evaluation: ReturnType<typeof evaluateGuess>; correct: boolean }>(
        loadedContent,
        "validate_guess",
        { guess: normalized },
      ).catch(error => {
        validationError = error instanceof Error ? error.message : "";
        return null;
      });
    if (!evaluation) {
      setMessage(validationError === "invalid_wordle_word"
        ? "Palavra não reconhecida no vocabulário bíblico. Tente outra."
        : "Não foi possível validar a palavra. Tente novamente.");
      submittingRef.current = false;
      return;
    }
    const nextGuesses = [...guesses, normalized];
    setGuesses(nextGuesses);
    setGuessEvaluations(current => [...current, evaluation.evaluation]);
    currentGuessRef.current = Array.from({ length: wordLength }, () => "");
    setCurrentGuess([...currentGuessRef.current]);
    setSelectedCell(0);

    if (evaluation.correct) {
      setMessage("Palavra correta! Registrando resultado…");
      await recordPlatformGameCompletion({
        gameId: "wordle-biblico",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        guesses: nextGuesses,
      }).then(() => {
        setStatus("won");
        setMessage(`Você venceu em ${nextGuesses.length} tentativa${nextGuesses.length === 1 ? "" : "s"}!`);
      }).catch(() => {
        setGuesses(guesses);
        setGuessEvaluations(current => current.slice(0, -1));
        currentGuessRef.current = [...normalized];
        setCurrentGuess([...normalized]);
        setMessage("Não foi possível registrar o resultado. Confirme a palavra novamente.");
      });
    } else if (nextGuesses.length === WORDLE_MAX_ATTEMPTS) {
      setMessage("Tentativas encerradas. Registrando resultado…");
      await recordPlatformGameCompletion({
        gameId: "wordle-biblico",
        sessionId: sessionId.current,
        contentId: content.id,
        contentVersion: content.version,
        guesses: nextGuesses,
      }).then(() => {
        setStatus("lost");
        setMessage(answer ? `Fim de jogo. A palavra era ${answer}.` : "Fim de jogo. Tente novamente amanhã.");
      }).catch(() => {
        setGuesses(guesses);
        setGuessEvaluations(current => current.slice(0, -1));
        currentGuessRef.current = [...normalized];
        setCurrentGuess([...normalized]);
        setMessage("Não foi possível registrar o resultado. Confirme a palavra novamente.");
      });
    } else {
      setMessage(`Tentativa ${nextGuesses.length} de ${WORDLE_MAX_ATTEMPTS}. Continue!`);
    }
    submittingRef.current = false;
  }

  function restart() {
    sessionId.current = createGameSessionId();
    submittingRef.current = false;
    currentGuessRef.current = Array.from({ length: wordLength }, () => "");
    setGuesses([]);
    setGuessEvaluations([]);
    setCurrentGuess([...currentGuessRef.current]);
    setSelectedCell(0);
    setStatus("playing");
    setMessage(`Digite uma palavra de ${wordLength} letras. Você pode escolher qualquer posição.`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter") void submitGuess();
      else if (event.key === "Backspace") removeLetter();
      else if (event.key === "ArrowLeft") setSelectedCell(current => Math.max(0, current - 1));
      else if (event.key === "ArrowRight") setSelectedCell(current => Math.min(wordLength - 1, current + 1));
      else if (/^[a-zA-Z]$/.test(event.key)) addLetter(event.key.toUpperCase());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const rows = Array.from({ length: WORDLE_MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const draft = rowIndex === guesses.length && status === "playing" ? currentGuess : [];
    const letters = submitted && guessEvaluations[rowIndex]
      ? guessEvaluations[rowIndex]
      : Array.from({ length: wordLength }, (_, index) => ({ letter: draft[index] || "", state: undefined }));
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
      gameType={GameType.WORDLE}
      mode={loadedContent?.mode}
      onRestart={restart}
    >
      <section className="wordle-game" aria-label="Wordle Bíblico">
      {contentState === "loading" && <p className="wordle-message" role="status">Selecionando uma palavra publicada…</p>}
      {contentState === "error" && <p className="wordle-message lost" role="alert">{message}</p>}
      {contentState === "ready" && content?.hint && <p className="wordle-message">Dica: {content.hint}</p>}
      {contentState === "ready" && <GameInstruction>
        Verde: posição correta. Amarelo: existe em outra posição. Cinza: não pertence à palavra.
      </GameInstruction>}
      <div className="wordle-board" aria-label="Tabuleiro do Wordle Bíblico" style={{ "--word-length": wordLength } as CSSProperties}>
        {rows.map((row, rowIndex) => (
          <div className="wordle-row" key={rowIndex} aria-label={`Tentativa ${rowIndex + 1}`}>
            {row.letters.map((item, letterIndex) => row.submitted
              ? <span className={`wordle-cell ${item.state} ${item.letter ? "filled" : ""}`} key={letterIndex} role="img" aria-label={`${item.letter}: ${item.state === "correct" ? "correta" : item.state === "present" ? "presente" : "ausente"}`}>
                {item.letter}<small aria-hidden="true">{item.state === "correct" ? "✓" : item.state === "present" ? "•" : "×"}</small>
              </span>
              : <button
                className={`wordle-cell editable ${rowIndex === guesses.length && selectedCell === letterIndex ? "selected" : ""} ${item.letter ? "filled" : ""}`}
                disabled={rowIndex !== guesses.length || status !== "playing"}
                key={letterIndex}
                type="button"
                onClick={() => setSelectedCell(letterIndex)}
                aria-label={`Posição ${letterIndex + 1}${item.letter ? `, letra ${item.letter}` : ", vazia"}${selectedCell === letterIndex ? ", selecionada" : ""}`}
              >{item.letter}</button>
            )}
          </div>
        ))}
      </div>

      {contentState === "ready" && <p className={`wordle-message ${status}`} role="status" aria-live="polite">{message}</p>}

      {contentState === "ready" && status === "playing" && (
        <div className="wordle-keyboard" aria-label="Teclado virtual">
          {KEYBOARD_ROWS.map((row, index) => (
            <div className="wordle-keyboard-row" key={row}>
              {index === 2 && <button className="wordle-key wide" type="button" onClick={submitGuess}>Enter</button>}
              {[...row].map(letter => <button className={`wordle-key ${keyboardState[letter] || ""}`} type="button" onClick={() => addLetter(letter)} key={letter} aria-label={`Letra ${letter}${keyboardState[letter] ? `: ${keyboardState[letter] === "correct" ? "correta" : keyboardState[letter] === "present" ? "presente" : "ausente"}` : ""}`}>{letter}</button>)}
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
