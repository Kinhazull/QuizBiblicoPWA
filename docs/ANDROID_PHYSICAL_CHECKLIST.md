# Checklist Android físico — pré-RC

Registrar aparelho, Android, navegador, data, SHA e resultado. Não marcar aprovado sem execução humana.

**Execução 27.7.5E:** o proprietário confirmou em 24/08/2026 a aprovação funcional dos blocos de instalação/navegação, teclado/lifecycle/rede, idempotência e jogos/Admin no runtime `98b0dc45...`, com zero `BLOCKER` e zero `MAJOR`. Classificação: `ANDROID_MANUAL_VALIDATION_PASSED`. Modelo, Android e navegador não foram informados; registrar esses metadados na próxima matriz.

- [x] instalar pela ação do navegador e confirmar nome/ícone;
- [x] abrir em modo standalone e validar splash/background;
- [x] abrir Home, Jogos, Daily, Eventos, Ranking e Perfil sem overflow;
- [x] usar teclado em login, MFA, Wordle, Quem Sou Eu e Três Pistas;
- [x] validar botão Voltar durante e fora de partida;
- [x] iniciar partida, enviar ao background, bloquear/desbloquear e retomar;
- [x] confirmar que timer/estado não corrompem nem duplicam recompensa;
- [x] abandonar uma partida e confirmar derrota/retorno correto;
- [x] alternar offline/online e confirmar somente o fallback prometido;
- [x] fazer logout, entrar com outro usuário e verificar ausência de dados anteriores;
- [x] validar atualização A→B sem loop pelo gate production-like/remoto; atualização automatizada complementa a evidência humana sem atribuir ao aparelho o que não foi informado;
- [x] validar Daily sem replay e Evento sem segunda tentativa;
- [x] validar orientação principal em retrato; landscape ampliado permanece melhoria de matriz;
- [x] registrar baseline LAB móvel pública de LCP/CLS/TBT; INP e FIELD aguardam tráfego/amostra real e não foram inventados.

Critério: nenhum vazamento de sessão/cache, conclusão duplicada, navegação bloqueada ou falha de atualização. Evidências devem ser anexadas ao Go/No-Go, não ao repositório se contiverem dados pessoais.
