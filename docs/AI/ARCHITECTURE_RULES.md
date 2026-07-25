# Regras de arquitetura

- Não duplicar regra crítica no frontend.
- Não persistir recompensa no navegador.
- Não reutilizar tabelas competitivas por conveniência.
- Mudanças de contrato exigem versionamento.
- Outbox deve ser gravada na mesma transação do evento de domínio quando aplicável.
- Retry deve possuir limite e observabilidade.
- Dead letter deve ser inspecionável.
- Migrations devem ser aditivas quando possível.
- Deploy não deve aplicar migrations automaticamente.
- Service Worker não deve armazenar APIs autenticadas ou HTML privado.
