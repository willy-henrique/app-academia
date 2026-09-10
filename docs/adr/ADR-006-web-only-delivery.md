# ADR-006 — Entrega exclusivamente web

- Status: aceita
- Data: 2026-09-10

## Contexto

O produto foi inicialmente preparado para instalação PWA. A prioridade atual é uma experiência web responsiva e previsível; o service worker anterior interferiu no carregamento local de assets do Next.

## Decisão

O WillTreino será entregue apenas como aplicação web. Não há manifest, instalação, cache de app shell nem registro de service worker. O último `sw.js` é uma ponte de aposentadoria que se desregistra para recuperar navegadores que ainda controlam a versão antiga.

## Consequências

- A experiência web em `localhost` e produção deixa de depender de ciclo de worker/cache.
- Persistência temporária de sessão e fila de séries seguem como resiliência de navegador, sem promessa de uso offline instalável.
- PWA pode ser reavaliada em ADR futuro somente quando houver requisito explícito, estratégia de cache e validação em navegadores reais.
