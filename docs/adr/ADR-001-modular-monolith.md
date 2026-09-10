# ADR-001 — Modular monolith como arquitetura inicial

- **Status:** Aceita
- **Decisão:** Manter domínios, casos de uso e adapters no mesmo produto Next.js/Functions, com dependências unidirecionais.
- **Contexto:** O produto exige muitos domínios, mas ainda não demonstrou necessidade operacional de microserviços.
- **Consequências:** Menor custo operacional e transações/coerência mais simples; módulos devem ter interfaces claras para futura extração, se necessária.
