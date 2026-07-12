"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  category: string;
  question: string;
  answers: string[];
  correct: number;
  fact: string;
  emoji: string;
};

const QUESTIONS: Question[] = [
  { category: "JOÃO 9", question: "Qual era a condição do homem em João 9 antes de encontrar Jesus?", answers: ["Era paralítico desde o nascimento", "Era leproso", "Era cego de nascença", "Era surdo"], correct: 2, fact: "Jesus mostrou que aquela situação serviria para manifestar a glória de Deus.", emoji: "📖" },
  { category: "ATOS 3", question: "Quem disse: \"Não tenho prata nem ouro, mas o que tenho isso te dou\"?", answers: ["Paulo", "João Batista", "Pedro", "Filipe"], correct: 2, fact: "Pedro falou isso ao coxo da Porta Formosa antes de sua cura.", emoji: "🌟" },
  { category: "JOÃO 9", question: "Após ser curado por Jesus, o homem cego de João 9 fez o quê?", answers: ["Voltou imediatamente para casa", "Escondeu o milagre", "Pediu dinheiro", "Contou o que Jesus havia feito, mesmo sendo questionado pelos fariseus"], correct: 3, fact: "Ele não teve vergonha de testemunhar.", emoji: "🗣️" },
  { category: "SALMOS 105:1", question: "Segundo Salmos 105:1, devemos tornar conhecidos entre as nações...", answers: ["nossos sonhos", "nossas dificuldades", "nossas vitórias", "os feitos do Senhor"], correct: 3, fact: "Deem graças ao Senhor, invoquem o seu nome; tornem conhecidos entre as nações os seus feitos.", emoji: "🌍" },
  { category: "LUCAS 17", question: "Qual destes personagens voltou para agradecer Jesus depois de ser curado?", answers: ["O paralítico de Cafarnaum", "Bartimeu", "Um dos dez leprosos", "O cego de Betsaida"], correct: 2, fact: "Somente um voltou para agradecer, e era samaritano.", emoji: "🙏" },
  { category: "JOÃO 9", question: "Quando perguntaram por que o homem havia nascido cego, Jesus respondeu que isso aconteceu para...", answers: ["Castigar seus pais", "Mostrar consequência do pecado", "Manifestar as obras de Deus", "Provar a fé dos discípulos"], correct: 2, fact: "Jesus explicou que as obras de Deus seriam manifestadas na vida daquele homem.", emoji: "✨" },
  { category: "ATOS 3", question: "Qual foi a primeira reação do homem curado na Porta Formosa?", answers: ["Foi para casa", "Dormiu", "Começou a pregar imediatamente", "Entrou no templo andando, saltando e louvando a Deus"], correct: 3, fact: "Todos o viram andando e louvando a Deus.", emoji: "🙌" },
  { category: "MILAGRES", question: "Qual destes NÃO foi um milagre realizado por Jesus?", answers: ["Transformar água em vinho", "Ressuscitar Lázaro", "Curar um cego de nascença", "Abrir o Mar Vermelho"], correct: 3, fact: "Quem abriu o Mar Vermelho foi Deus através de Moisés.", emoji: "🌊" },
  { category: "SALMOS 105:1", question: "Complete: \"Deem graças ao Senhor, invoquem o seu nome; tornem conhecidos entre as nações...\"", answers: ["a sua Palavra", "os seus mandamentos", "os seus feitos", "a sua justiça"], correct: 2, fact: "O salmista nos convida a contar entre as nações os feitos do Senhor.", emoji: "📜" },
  { category: "TESTEMUNHO", question: "Qual é o principal objetivo de compartilhar um testemunho?", answers: ["Mostrar como somos fortes", "Impressionar as pessoas", "Ser reconhecido pela igreja", "Glorificar a Deus e fortalecer a fé de outras pessoas"], correct: 3, fact: "Nosso testemunho aponta para o que Deus fez e encoraja outras pessoas a crer.", emoji: "🕊️" },
];

const LETTERS = ["A", "B", "C", "D"];

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ displayName: string; role: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [screen, setScreen] = useState<"start" | "game" | "result">("start");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [time, setTime] = useState(15);
  const question = QUESTIONS[index];

  useEffect(() => {
    const stored = Number(localStorage.getItem("quizup-best") || 0);
    setBest(stored);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
    fetch("/api/auth/me").then(async (response) => {
      if (response.ok) setUser((await response.json()).user);
    }).finally(() => setAuthReady(true));
  }, []);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true); setAuthError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = authMode === "login"
      ? { username: data.username, password: data.password, persistent: data.persistent === "on" }
      : { displayName: data.displayName, username: data.username, password: data.password, inviteCode: data.inviteCode };
    try {
      const response = await fetch(`/api/auth/${authMode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = { invalid_credentials: "Usuário ou senha incorretos.", pending_approval: "Seu cadastro ainda aguarda aprovação.", account_unavailable: "Esta conta não está disponível.", invalid_invitation: "O código de convite é inválido ou expirou.", username_unavailable: "Este nome de usuário já está em uso.", invalid_fields: "Confira os dados. A senha deve ter pelo menos 8 caracteres." };
        setAuthError(messages[result.error] || "Não foi possível continuar."); return;
      }
      if (authMode === "register") { setAuthError(result.status === "pending" ? "Cadastro enviado! Aguarde a aprovação do líder." : "Cadastro aprovado. Agora entre com sua conta."); setAuthMode("login"); return; }
      setUser(result.user);
    } catch { setAuthError("Sem conexão com o servidor. Tente novamente."); }
    finally { setAuthBusy(false); }
  }

  useEffect(() => {
    if (screen !== "game" || selected !== null) return;
    if (time <= 0) { setSelected(-1); setStreak(0); return; }
    const timer = window.setTimeout(() => setTime((t) => t - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [screen, selected, time]);

  const progress = ((index + (selected !== null ? 1 : 0)) / QUESTIONS.length) * 100;
  const points = useMemo(() => Math.max(100, 400 + time * 40 + streak * 100), [time, streak]);

  function startGame() {
    setIndex(0); setScore(0); setStreak(0); setSelected(null); setTime(15); setScreen("game");
  }

  function choose(answer: number) {
    if (selected !== null) return;
    setSelected(answer);
    if (answer === question.correct) { setScore((s) => s + points); setStreak((s) => s + 1); }
    else setStreak(0);
  }

  function next() {
    if (index === QUESTIONS.length - 1) {
      const finalScore = score;
      if (finalScore > best) { setBest(finalScore); localStorage.setItem("quizup-best", String(finalScore)); }
      setScreen("result"); return;
    }
    setIndex((i) => i + 1); setSelected(null); setTime(15);
  }

  if (!authReady) return <main className="shell auth-screen"><div className="auth-loading"><span className="brand-dot">✦</span><p>Preparando sua competição...</p></div></main>;

  if (!user) return <main className="shell auth-screen">
    <div className="ambient one" /><div className="ambient two" />
    <section className="auth-card">
      <header className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</header>
      <p className="eyebrow">COMPETIÇÃO BÍBLICA</p>
      <h1>{authMode === "login" ? <>Que bom ter você<br/><em>de volta</em></> : <>Entre para a<br/><em>competição</em></>}</h1>
      <p className="intro">{authMode === "login" ? "Acesse sua conta para jogar a rodada da semana e acompanhar os rankings." : "Use o código do seu grupo. Seu cadastro será analisado por um líder."}</p>
      <form onSubmit={submitAuth}>
        {authMode === "register" && <label>Seu nome<input name="displayName" autoComplete="name" required minLength={3} placeholder="Nome e sobrenome" /></label>}
        {authMode === "register" && <label>Código do grupo<input name="inviteCode" autoCapitalize="characters" required placeholder="Ex.: FAROL-2026" /></label>}
        <label>Nome de usuário<input name="username" autoCapitalize="none" autoComplete="username" required minLength={3} placeholder="Como você vai entrar" /></label>
        <label>Senha<input name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} required minLength={8} placeholder="Mínimo de 8 caracteres" /></label>
        {authMode === "login" && <label className="remember"><input name="persistent" type="checkbox" /> Permanecer conectado neste aparelho</label>}
        {authError && <p className="auth-message">{authError}</p>}
        <button className="primary" disabled={authBusy}>{authBusy ? "AGUARDE..." : authMode === "login" ? "ENTRAR" : "CRIAR MINHA CONTA"}<span>→</span></button>
      </form>
      <button className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button>
    </section>
  </main>;

  if (screen === "start") return (
    <main className="shell start-screen">
      <div className="ambient one" /><div className="ambient two" />
      <header className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</header>
      <p className="welcome">Olá, {user.displayName}</p>
      <section className="hero-card">
        <div className="orbit"><span>📖</span><i /><b /></div>
        <p className="eyebrow">QUIZ BÍBLICO</p>
        <h1>Contem o que<br/><em>Deus fez</em></h1>
        <p className="intro">Testemunhos, milagres e os feitos de Deus. Dez perguntas para aprender, lembrar e compartilhar.</p>
        <button className="primary" onClick={() => location.href = "/jogar"}>VER RODADA DA SEMANA <span>→</span></button>
        <div className="home-links"><a href="/rankings">🏆 Ver rankings</a>{["admin", "leader"].includes(user.role) && <a href="/admin">⚙️ Painel administrativo</a>}</div>
        <div className="mini-stats"><span><b>10</b> perguntas</span><span><b>15s</b> cada</span><span><b>🏆</b> recorde {best}</span></div>
      </section>
      <p className="footer-note">Sem cadastro · Grátis · Feito para jogar no celular</p>
    </main>
  );

  if (screen === "result") {
    const max = QUESTIONS.length * 1000;
    const rank = score > 7500 ? "TESTEMUNHA FIEL" : score > 5500 ? "CONHECEDOR DA PALAVRA" : score > 3000 ? "APRENDIZ DEDICADO" : "SEMENTE DE FÉ";
    return <main className="shell result-screen">
      <div className="confetti c1" /><div className="confetti c2" /><div className="confetti c3" />
      <header className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</header>
      <section className="result-card">
        <div className="trophy">🏆</div><p className="eyebrow">FIM DE JOGO</p>
        <h1>Você é <em>{rank}!</em></h1>
        <div className="score-block"><small>SUA PONTUAÇÃO</small><strong>{score.toLocaleString("pt-BR")}</strong><span>pontos</span></div>
        <div className="rank-line"><span>Seu melhor: <b>{Math.max(best, score).toLocaleString("pt-BR")}</b></span><span>Meta máxima: {max.toLocaleString("pt-BR")}</span></div>
        <button className="primary" onClick={startGame}>JOGAR NOVAMENTE <span>↻</span></button>
      </section>
    </main>;
  }

  const isCorrect = selected === question.correct;
  return <main className="shell game-screen">
    <header className="game-header"><div className="brand"><span className="brand-dot">✦</span> CONTE OS FEITOS</div><div className="live-score"><small>PONTOS</small><b>{score.toLocaleString("pt-BR")}</b></div></header>
    <div className="progress"><i style={{width: `${progress}%`}} /></div>
    <section className="game-card">
      <div className="question-meta"><span className="category">{question.emoji} {question.category}</span><span>PERGUNTA {index + 1}<b> / {QUESTIONS.length}</b></span></div>
      <div className={`timer ${time <= 5 ? "urgent" : ""}`} style={{"--time": `${time * 24}deg`} as React.CSSProperties}><span>{time}</span></div>
      <h2>{question.question}</h2>
      <div className="answers">
        {question.answers.map((answer, i) => {
          let state = "";
          if (selected !== null && i === question.correct) state = "correct";
          else if (selected === i) state = "wrong";
          return <button key={answer} className={state} onClick={() => choose(i)} disabled={selected !== null}><b>{LETTERS[i]}</b><span>{answer}</span><i>{state === "correct" ? "✓" : state === "wrong" ? "×" : ""}</i></button>;
        })}
      </div>
      {selected !== null && <div className={`feedback ${isCorrect ? "good" : "bad"}`}>
        <div><strong>{isCorrect ? `Mandou bem! +${points}` : selected === -1 ? "O tempo acabou!" : "Quase!"}</strong><p>{question.fact}</p></div>
        <button onClick={next}>{index === QUESTIONS.length - 1 ? "VER RESULTADO" : "PRÓXIMA"} →</button>
      </div>}
      {selected === null && streak > 1 && <div className="streak">🔥 Sequência de {streak} acertos!</div>}
    </section>
  </main>;
}
