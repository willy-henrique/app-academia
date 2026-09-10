# Performance

## Baseline de bundle (2026-09-09, `npm run build`)

Total de chunks estáticos: **1,8 MB** sem compressão. Os maiores são o SDK do Firebase e o runtime do React/Next:

| Chunk            | Tamanho |
| ---------------- | ------- |
| `688-*.js`       | 236 KB  |
| `ddcdf4aa-*.js`  | 232 KB  |
| `f798611d-*.js`  | 200 KB  |
| `framework-*.js` | 188 KB  |
| `059353e3-*.js`  | 140 KB  |
| `main-*.js`      | 136 KB  |

O que já está fora do carregamento inicial:

- Gráficos de evolução (`ProgressCharts`) entram por `next/dynamic` no `/dashboard`.
- Não há biblioteca de gráficos: o desenho é SVG/CSS próprio, o que evita ~100 KB de Recharts e mantém a tabela acessível como fonte dos dados.
- Nutrição, IA, câmera e administração ainda não existem — quando entrarem, seguem a mesma regra: fora da Home e atrás de import dinâmico.

Próximo passo com maior retorno: carregar Firestore/Functions sob demanda nas telas públicas (login, signup, recuperação), que hoje só precisam de Auth.

## Leituras do Firestore por tela

| Tela                   | Leituras                                                                   | Cuidado aplicado                                          |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| `/dashboard` semana    | 1 documento (`weeklyStats/{uid}/weeks/{weekKey}`) + 1 do perfil            | Projeção pronta: nenhuma varredura de sessão              |
| `/dashboard` histórico | 1 consulta paginada (8 semanas, `orderBy weekKey desc`)                    | Só quando a pessoa pede                                   |
| `/dashboard` gráficos  | 1 consulta (8 sessões) + 1 leitura de `sets` por sessão                    | Limite explícito de sessões; sem varrer histórico inteiro |
| `/workout`             | 1 perfil + 1 sessão ativa                                                  | Ponteiro `activeWorkoutSessionId`, sem consulta ampla     |
| `/cardio`              | 1 consulta limitada a 5 cardios                                            | `orderBy createdAt desc` + `limit`                        |
| `/group/{id}`          | 1 listener no documento da sessão + 1 listener na coleção de participantes | Nada de listener por série ou por usuário                 |

Não há N+1 conhecido fora do gráfico de evolução, cujo fan-out é limitado por um número fixo de sessões e roda apenas sob demanda.

## Listeners em tempo real

Somente o lobby de grupo usa `onSnapshot`, e apenas em dois caminhos: o documento da sessão e a coleção de participantes daquela sessão. Cronômetros são derivados de timestamp (`startAt`, `restStartedAt`), não de eventos por segundo. Sair da tela cancela as assinaturas; a reconexão reaproveita a mesma assinatura em vez de abrir uma nova.

## Mídia

`next.config.ts` habilita AVIF/WebP e restringe `remotePatterns` ao Storage do próprio projeto. Ainda não há vídeo no produto; quando entrar a mídia de técnica, valem as regras já escritas em [ACCESSIBILITY.md](ACCESSIBILITY.md): sem autoplay com som, com legenda e carregada sob demanda.

## Cache

O service worker mantém o app shell e as rotas básicas, com navegação _network-first_ para não servir tela velha, e nunca guarda resposta do Firebase nem de `/api/` — cache e privacidade não competem entre si. Detalhes em [PWA_OFFLINE.md](PWA_OFFLINE.md).

## Pendente

Medição de campo (Lighthouse/CWV) exige rodar contra um deploy: o projeto ainda não tem Lighthouse CI nem Playwright instalados. O passo está no [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) com o comando sugerido e as metas (LCP < 2,5 s, INP < 200 ms, CLS < 0,1 em 4G móvel).
