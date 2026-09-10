# ADR-004 — Sessão de grupo única e início autoritativo

- **Status:** Aceita
- **Decisão:** Uma `groupSession` representa o treino. Function idempotente cria `startAt` com horário de servidor; sets permanecem individuais.
- **Contexto:** Clientes independentes e timers baseados em contadores locais causam divergência e duplicidade.
- **Consequências:** Realtime observa estado mínimo; reconexão deriva timers de timestamps e métricas usam ledger idempotente.
