# Fundação de produto — Conte os Feitos

Esta pasta reúne as decisões que orientam a evolução do **Conte os Feitos** de um Quiz Bíblico PWA para uma plataforma cristã modular de **Jogos e Desafios Bíblicos**.

## Documentos

| Documento | Finalidade |
| --- | --- |
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Visão, público, princípios e limites do produto |
| [ROADMAP.md](ROADMAP.md) | Sequência oficial dos módulos de evolução |
| [AI_COLLABORATION.md](AI_COLLABORATION.md) | Regras para colaboração com ferramentas de IA |
| [DECISION_LOG.md](DECISION_LOG.md) | Registro cronológico das decisões de produto e arquitetura |
| [RELEASE_V1_SCOPE.md](RELEASE_V1_SCOPE.md) | Escopo oficial da primeira release da plataforma |
| [CORE_PLATFORM_ARCHITECTURE.md](CORE_PLATFORM_ARCHITECTURE.md) | Arquitetura dos serviços compartilhados |
| [DOMAIN_MODEL.md](DOMAIN_MODEL.md) | Modelo de domínio independente de persistência |
| [CORE_PLATFORM_EVENT_ENGINE.md](CORE_PLATFORM_EVENT_ENGINE.md) | Contrato arquitetural do Event Engine |
| [GAME_INTEGRATION_CONTRACT.md](GAME_INTEGRATION_CONTRACT.md) | Contrato oficial entre jogos e Core Platform |
| [GAME_CATALOG.md](GAME_CATALOG.md) | Catálogo oficial de jogos e seus estados |
| [MISSION_SYSTEM_ARCHITECTURE.md](MISSION_SYSTEM_ARCHITECTURE.md) | Arquitetura oficial de missões |
| [MISSION_CATALOG.md](MISSION_CATALOG.md) | Catálogo versionado de missões v1 |
| [CORE_PLATFORM_ACHIEVEMENTS_CATALOG.md](CORE_PLATFORM_ACHIEVEMENTS_CATALOG.md) | Catálogo oficial de conquistas globais v1 |
| [ARCHITECTURE_REVIEW_V1.md](ARCHITECTURE_REVIEW_V1.md) | Revisão arquitetural anterior à integração do Quiz |
| [PLATFORM_HARDENING_3_7F.md](PLATFORM_HARDENING_3_7F.md) | Resultado do hardening da fundação |
| [FOUNDATION_FINAL_REPORT.md](FOUNDATION_FINAL_REPORT.md) | Inventário e parecer final de integração da Foundation |

### Registros de implementação

- [Progress](CORE_PLATFORM_PROGRESS_IMPLEMENTATION.md)
- [Achievements](CORE_PLATFORM_ACHIEVEMENT_IMPLEMENTATION.md)
- [Event Engine](CORE_PLATFORM_EVENT_ENGINE_IMPLEMENTATION.md)
- [Statistics](CORE_PLATFORM_STATISTICS_IMPLEMENTATION.md)
- [Rewards](CORE_PLATFORM_REWARD_IMPLEMENTATION.md)
- [Missions](CORE_PLATFORM_MISSION_IMPLEMENTATION.md)
- [Mission Generator](CORE_PLATFORM_MISSION_GENERATOR_IMPLEMENTATION.md)

## Estado de referência

- A `main` representa a versão estável `v1.0.0` do piloto controlado.
- Mudanças futuras são desenvolvidas em branches próprias e só chegam à `main` após validação.
- O Quiz Bíblico é o primeiro módulo funcional e deve ser preservado integralmente durante a modularização.
- A documentação desta pasta não autoriza, por si só, mudanças no banco, APIs ou regras competitivas.

## Ordem de leitura

1. Visão do produto.
2. Roadmap oficial.
3. Registro de decisões.
4. Política de colaboração com IA.
