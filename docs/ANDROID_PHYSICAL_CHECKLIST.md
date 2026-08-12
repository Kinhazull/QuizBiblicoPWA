# Checklist Android físico — pré-RC

Registrar aparelho, Android, navegador, data, SHA e resultado. Não marcar aprovado sem execução humana.

- [ ] instalar pela ação do navegador e confirmar nome/ícone;
- [ ] abrir em modo standalone e validar splash/background;
- [ ] abrir Home, Jogos, Daily, Eventos, Ranking e Perfil sem overflow;
- [ ] usar teclado em login, MFA, Wordle, Quem Sou Eu e Três Pistas;
- [ ] validar botão Voltar durante e fora de partida;
- [ ] iniciar partida, enviar ao background, bloquear/desbloquear e retomar;
- [ ] confirmar que timer/estado não corrompem nem duplicam recompensa;
- [ ] abandonar uma partida e confirmar derrota/retorno correto;
- [ ] alternar offline/online e confirmar somente o fallback prometido;
- [ ] fazer logout, entrar com outro usuário e verificar ausência de dados anteriores;
- [ ] publicar uma versão posterior em ambiente controlado, aceitar atualização e confirmar novo conteúdo sem loop;
- [ ] validar Daily sem replay e Evento sem segunda tentativa;
- [ ] validar rotação somente onde suportada; orientação principal permanece retrato;
- [ ] registrar LCP/INP/CLS em aparelho real quando houver domínio candidato.

Critério: nenhum vazamento de sessão/cache, conclusão duplicada, navegação bloqueada ou falha de atualização. Evidências devem ser anexadas ao Go/No-Go, não ao repositório se contiverem dados pessoais.
