# ADR-005 — Engines determinísticas; IA contextual por ferramentas

- **Status:** Aceita
- **Decisão:** Código calcula prescrição, duração, descanso, custo, métricas e progressão; WillCoach consulta ferramentas com dados mínimos e explica resultados.
- **Contexto:** Cálculo fitness e financeiro crítico não pode variar por resposta de LLM.
- **Consequências:** Mais contratos e testes de domínio; IA é isolada por provider, safety layer e rate limit.
