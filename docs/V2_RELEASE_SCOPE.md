# Escopo da Release v2.0.0

Status: **Release Candidate `2.0.0-rc.1`**. A tag `v2.0.0` ainda não existe.

## Incluído

- autenticação, sessão e privacidade;
- Home, Perfil, Jogos, Recompensas, Inventário, Loja e Notificações;
- Quiz, Wordle, Linha do Tempo, Memória, Associação, Quem Sou Eu e Três Pistas;
- modos `FREE_PLAY`, `DAILY` e `EVENT`;
- CMS, Biblioteca, Conteúdo Base Oficial e governança editorial;
- progressão, moedas, missões e conquistas atuais;
- Eventos, Administração, Analytics, backup/restore e observabilidade.

## Classificação

- `RELEASE_BLOCKER`: perda/corrupção de dados, recompensa duplicada, bypass de autenticação, jogo principal inutilizável em 320 px, atualização PWA quebrada, migration divergente ou acessibilidade impeditiva.
- `KNOWN_LIMITATION`: jogos exigem conexão; retomada após encerramento do processo depende do lifecycle persistido no servidor; instalação e atualização precisam de validação final em Android real.
- `POST_V2`: offline completo, wrapper com APIs nativas, ranking universal, imagens editoriais amplas para Memória e otimizações marginais de performance.

## Gate

A publicação requer pipelines verdes, migrations promovidas pelo fluxo controlado, checklist manual aprovado, revisão jurídica pendente concluída e decisão do dono sobre domínio/package ID.
