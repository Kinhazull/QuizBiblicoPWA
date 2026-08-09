# Teste manual do Release Candidate

Execute depois do deploy controlado, em Android real e rede de teste.

1. Abrir Termos e Privacidade antes do login.
2. Entrar, atualizar a página e confirmar que não há loop.
3. Instalar o PWA pelo Chrome e abrir pelo ícone.
4. Confirmar nome, ícone, cor e orientação da instalação.
5. Abrir Home, Jogos, Perfil e Notificações em 320–412 px.
6. Confirmar safe-area e barra inferior sem conteúdo encoberto.
7. Iniciar e concluir um Daily; confirmar tentativa única.
8. Colocar o app em background durante a partida e retomá-lo.
9. Bloquear/desbloquear a tela durante uma partida temporizada.
10. Atualizar a página durante a partida e confirmar estado controlado.
11. Perder a conexão antes de iniciar: nenhuma partida falsa deve abrir.
12. Perder a conexão ao concluir: não assumir resultado/recompensa sem servidor.
13. Reconectar e confirmar mensagem/recuperação coerente.
14. Concluir Free Play e usar replay; confirmar seleção nova.
15. Iniciar Evento, abandonar e confirmar derrota/tentativa encerrada.
16. Validar os sete jogos em portrait e ao menos um em landscape.
17. Verificar teclado virtual no Wordle, Quem Sou Eu e Três Pistas.
18. Comprar/equipar item e confirmar persistência após reabrir o PWA.
19. Confirmar versão em Perfil.
20. Publicar uma nova versão controlada; aceitar aviso e confirmar reload na versão nova.
21. Sair da conta; usar voltar/refresh e confirmar que dados protegidos não reaparecem.
22. Entrar como admin e abrir CMS, Analytics, Eventos e Diagnóstico.
23. Conferir `supportId` em erro controlado sem dados sensíveis.
24. Validar instalação/atualização novamente em rede lenta.

Registre aparelho, Android, Chrome, rede, versão do app e evidências de cada falha.
