# Checklist manual da RC v2.0.0-rc.1

**Uso:** Sprint 27.7.4 — Validação Manual do Usuário
**Resultado por item:** `PASS`, `FAIL`, `OBSERVAÇÃO` ou `NÃO TESTADO`

Registre cada problema em “Problemas encontrados” com a tela, ação realizada, resultado esperado e resultado observado. Não inclua senhas, códigos MFA, recovery codes ou outros dados sensíveis.

## A. Primeiro acesso e login

- [ ] Entrar com uma conta participante válida.
- [ ] Confirmar mensagem clara para senha inválida.
- [ ] Sair da conta e confirmar retorno à tela de login.

## B. MFA administrativo

- [ ] Entrar com a conta administrativa controlada e confirmar solicitação do segundo fator.
- [ ] Confirmar que TOTP válido libera a Administração.
- [ ] Confirmar que a interface não exibe novamente segredo ou recovery codes já guardados.

## C. Home

- [ ] Conferir nome, avatar, moldura, nível, XP, moedas e sequência.
- [ ] Abrir Jogos, Desafios Diários, Recompensas, Perfil, Loja e Inventário.
- [ ] Confirmar ausência de cortes ou sobreposições.

## D. Jogos — sete módulos

Para cada jogo, iniciar uma partida livre, concluir ou abandonar e voltar ao catálogo:

- [ ] Quiz Bíblico.
- [ ] Wordle Bíblico.
- [ ] Linha do Tempo Bíblica.
- [ ] Memória Bíblica.
- [ ] Associação de Temas.
- [ ] Quem Sou Eu?.
- [ ] Jogo das 3 Pistas.

Confirmar em cada um instruções claras, feedback de acerto/erro, resultado final, retorno correto e ausência do menu inferior durante a partida.

## E. Desafios Diários

- [ ] Abrir a lista diária e iniciar um jogo ainda não realizado.
- [ ] Concluir ou abandonar e confirmar que não existe nova tentativa/“Continuar”.
- [ ] Recarregar a página e confirmar que o resultado permanece fixo.

## F. Loja

- [ ] Conferir saldo e estados Comprar, Adquirido e Equipado.
- [ ] Comprar apenas se houver saldo e item ainda não adquirido.
- [ ] Confirmar atualização imediata sem saldo negativo.

## G. Inventário

- [ ] Conferir somente itens adquiridos.
- [ ] Equipar avatar e moldura e confirmar troca imediata.
- [ ] Recarregar e confirmar persistência.

## H. Recompensas e coleções

- [ ] Conferir conquistas, coleções e progresso visual.
- [ ] Confirmar que artes e textos correspondem ao item exibido.

## I. Perfil

- [ ] Conferir identidade, progresso, estatísticas e jogos.
- [ ] Alterar um campo não sensível, salvar e recarregar.
- [ ] Confirmar logout seguro.

## J. Ranking

- [ ] Abrir o Ranking Universal.
- [ ] Confirmar posição, identidade visual e navegação de retorno.

## K. Eventos

- [ ] Abrir a área de Eventos.
- [ ] Se houver evento ativo/controlado, abrir detalhes e validar uma participação permitida.
- [ ] Se não houver evento, confirmar estado vazio claro.

## L. Recuperação e alteração de senha

- [ ] Abrir recuperação de conta e confirmar instruções coerentes.
- [ ] Testar alteração de senha apenas com conta controlada e planejamento de retorno.
- [ ] Confirmar que nenhum fluxo promete envio de e-mail inexistente.

## M. Responsividade celular

- [ ] Validar Home, Jogos, Daily, Perfil, Loja, Inventário e Administração no celular.
- [ ] Confirmar ausência de overflow horizontal e alvos de toque confortáveis.
- [ ] Confirmar foco visível ao usar teclado quando disponível.

## N. PWA e instalação

- [ ] Instalar pelo navegador compatível.
- [ ] Abrir pelo ícone instalado e conferir nome/ícone/tema.
- [ ] Fechar e reabrir sem perda inesperada de sessão ou navegação.

## O. Offline

- [ ] Com a aplicação já carregada, ativar modo offline.
- [ ] Confirmar fallback público amigável e ausência de dados privados em cache.
- [ ] Voltar online e confirmar recuperação normal.

## P. Administração

- [ ] Abrir Central Administrativa após MFA.
- [ ] Abrir Acervo, Planejamento, Analytics e Diagnóstico.
- [ ] Confirmar que operações restritas permanecem protegidas e que Health não escreve dados.

## Q. Impressão visual e artes

- [ ] Confirmar identidade Conte os Feitos, sem aparência do antigo Quiz.
- [ ] Conferir artes dos sete jogos, recompensas, avatares, molduras e estados vazios/erro.
- [ ] Registrar qualquer placeholder, imagem distorcida ou contraste insuficiente.

## R. Conteúdo

- [ ] Registrar exemplos de pergunta, dica, associação ou cronologia ambígua.
- [ ] Conferir clareza, português, referência bíblica e adequação da dificuldade.
- [ ] Não editar o conteúdo produtivo durante esta validação.

## S. Problemas encontrados

| ID | Severidade | Tela/fluxo | Como reproduzir | Esperado | Observado | Evidência | Estado |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

### Severidades

- `BLOCKER`: impede uso, compromete segurança ou integridade, bloqueia login/jogo/fluxo principal.
- `MAJOR`: função importante defeituosa, mas existe workaround.
- `MINOR`: problema limitado que não impede o fluxo.
- `COSMETIC`: problema visual ou textual sem impacto funcional.

Somente `BLOCKER` e `MAJOR` normalmente impedem o Go da RC. A decisão formal ocorre na 27.7.6.
