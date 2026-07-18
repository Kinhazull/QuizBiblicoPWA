# Registro de decisões

As decisões são aditivas. Se uma decisão mudar, uma nova entrada deve registrar a substituição e seus motivos, sem apagar o histórico anterior.

## 2026-07-18 — Fundação modular aprovada

**Status:** aceita.

### Contexto

O Conte os Feitos iniciou como Quiz Bíblico PWA e concluiu o piloto técnico `v1.0.0`. A evolução seguinte transforma o produto em plataforma modular de Jogos e Desafios Bíblicos, preservando o Quiz validado.

### Decisões

1. **Marca e produto:** Conte os Feitos é a marca; Jogos e Desafios Bíblicos é o produto atual da futura plataforma cristã modular.
2. **Primeiro módulo:** o Quiz Bíblico permanece como primeiro módulo funcional.
3. **Jornada:** pertence exclusivamente ao Quiz Bíblico.
4. **Medalhas:** permanecem premiações competitivas das Jornadas.
5. **Conquistas:** serão objetivos gerais da plataforma e não substituem Medalhas.
6. **Temporadas futuras:** afetarão apenas desbloqueáveis e colecionáveis gerais, salvo nova decisão formal. As Temporadas já existentes do Quiz permanecem no domínio do Quiz.
7. **Conteúdo:** os jogos continuarão utilizando conteúdo amplo de toda a Bíblia.
8. **Persistência:** novos módulos não reutilizarão `rounds` e `attempts` sem decisão formal.
9. **Fonte da verdade:** pontuação, progressão, moedas, recompensas e desbloqueáveis persistentes permanecem sob validação do servidor.
10. **Estabilidade:** a `main` e a tag `v1.0.0` representam a versão estável do piloto; implementações futuras ocorrem em branch própria.
11. **Roadmap:** a numeração oficial é Módulo 0 a Módulo 10. Shell, catálogo, Home modular e integração do Quiz são subdivisões do Módulo 2.

### Consequências

- O Módulo 1 não deve iniciar antes da aprovação desta fundação documental.
- Os primeiros trabalhos do Módulo 2 podem ser realizados sem migrations.
- A criação do núcleo de progressão e sua persistência pertence ao Módulo 3.
- Mudanças de banco ou compartilhamento de domínios exigem nova entrada neste registro.

### Baseline da decisão

- Referência: `v1.0.0`, commit `92b7249`.
- Branch de preparação: `feature/platform-foundation`.
- Baseline: instalação congelada, lint, build e suíte `test:all` aprovados antes das alterações documentais.
