# Checklist técnico — Data Safety

Este inventário não constitui resposta jurídica. Marcação geral: **LEGAL_REVIEW_REQUIRED**.

| Domínio | Dados/uso técnico | Observação |
|---|---|---|
| Autenticação | identificador, hash de senha, sessão, IP/user-agent reduzidos | segurança e acesso |
| Perfil | nome, apelido, bio e preferências | fornecido pelo usuário |
| Jogos | participações, respostas/resultados e tempos | funcionamento e integridade |
| Progressão | XP, nível, moedas, missões e conquistas | funcionalidade da plataforma |
| Economia virtual | compras e equipamentos sem pagamento real | propriedade virtual |
| Eventos | participação e resultado | funcionalidade |
| Notificações | avisos internos | sem push externo confirmado |
| Analytics | agregados próprios e operacionais | sem SDK externo nesta fase |
| CMS/editorial | autoria, revisão, comentários e auditoria | usuários autorizados |
| Segurança | logs sanitizados e supportId | não registrar segredo/payload sensível |

## Revisão humana obrigatória

- finalidade, base legal, compartilhamento e retenção por categoria;
- tratamento de menores e consentimento responsável;
- exclusão/anonimização e exportação;
- licença dos textos bíblicos;
- política pública coerente com Google Play;
- contatos jurídico, privacidade e suporte;
- confirmação de que nenhum tracking externo foi adicionado.
