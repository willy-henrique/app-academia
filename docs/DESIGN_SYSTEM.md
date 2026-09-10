# WillTreino Design System — light-first

Status: especificação de referência para UI-002. A implementação será centralizada em `src/app/globals.css` e exposta ao Tailwind v4 por `@theme inline`.

## Princípios

- Ação principal é azul; verde significa conclusão/sucesso; âmbar informa descanso/atenção; vermelho é erro ou risco.
- Superfícies claras, bordas discretas e sombra só quando definem hierarquia.
- Layout web responsivo: desktop para planejamento, mobile para execução e tablet como modo híbrido.
- Nenhuma informação essencial depende de hover, cor, animação ou tooltip.

## Cores semânticas

| Token                        | Valor                 | Uso                               |
| ---------------------------- | --------------------- | --------------------------------- |
| `background`                 | `#F7F8FA`             | fundo da aplicação                |
| `surface`                    | `#FFFFFF`             | cartões e áreas de conteúdo       |
| `surface-secondary`          | `#F1F4F8`             | áreas neutras, campos e skeletons |
| `foreground`                 | `#111827`             | texto principal                   |
| `foreground-secondary`       | `#64748B`             | texto auxiliar                    |
| `foreground-muted`           | `#94A3B8`             | legenda e estado neutro           |
| `primary`                    | `#4F7CFF`             | CTA, link, item selecionado       |
| `primary-hover`              | `#3D68E8`             | hover                             |
| `primary-active`             | `#3458C7`             | active                            |
| `primary-subtle`             | `#EAF0FF`             | seleção e destaque leve           |
| `primary-border`             | `#C7D5FF`             | borda selecionada                 |
| `border`                     | `#E4E7EC`             | separação padrão                  |
| `success` / `success-subtle` | `#22C55E` / `#ECFDF3` | concluído e meta atingida         |
| `warning` / `warning-subtle` | `#F59E0B` / `#FFF7E6` | descanso e atenção leve           |
| `danger` / `danger-subtle`   | `#EF4444` / `#FEF2F2` | erro e ação destrutiva            |
| `info` / `info-subtle`       | `#0EA5E9` / `#F0F9FF` | informação contextual             |

O gradiente `#4F7CFF → #7C6CFF` é exclusivo de marca, hero e destaques excepcionais.

Para manter WCAG AA em CTAs com texto branco, a superfície efetiva do botão
primário usa `primary-hover` (`#3D68E8`, 4,83:1 sobre branco); `primary`
continua sendo a cor de marca, links e seleção. Isso evita trocar a paleta de
produto por um azul arbitrário ou reduzir a legibilidade de ações críticas.

## Tipografia

Fonte do sistema: pilha sans nativa legível. Escala: display, h1, h2, h3, section, body, body-sm, label, caption e metric. Números de treino usam `metric` com tabular figures quando fizer sentido. Pesos principais: 400, 500, 600, 700 e 800.

## Espaço, raio e sombra

- Escala de espaço: 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64 px.
- Raios: 8 (sm), 12 (md), 16 (lg), 20 (card), 24 (hero) e full.
- Sombra padrão: `0 1px 2px rgb(15 23 42 / 4%), 0 8px 24px rgb(15 23 42 / 6%)`.
- Sombra de destaque: `0 20px 60px rgb(15 23 42 / 8%)`; nunca glow.

## Componentes e estados

`Button`: primary, secondary, outline, ghost, danger e success; mínimo 44 px; loading e disabled.  
`Input`, `Textarea`, `Select`: label visível, unidade/ajuda, erro adjacente e foco azul.  
`Card`: neutro por padrão; somente cartões prioritários recebem elevação.  
`Badge`, `Chip`, `Tabs`, `ProgressBar`, `Toast`, `EmptyState`, `ErrorState` e `LoadingState`: usam tokens semânticos e texto/ícone além de cor.

## Layout e breakpoints

- Conteúdo: até 1280 px normalmente; páginas analíticas podem usar 1440 px.
- Mobile: < 768 px, bottom navigation, fluxo vertical e CTAs grandes.
- Tablet: 768–1023 px, duas colunas somente quando leitura não piorar.
- Desktop: ≥ 1024 px, sidebar compacta e conteúdo de planejamento.
- Não há layout específico por aparelho: os breakpoints representam mudanças de estrutura.

## Motion e acessibilidade

- Duração: 150–250 ms, apenas `opacity` e `transform` como padrão.
- `prefers-reduced-motion` remove animação não essencial.
- `:focus-visible` sempre usa anel de foco com contraste AA.
- Estados incluem texto, ícone ou forma; nunca somente cor.

## Tema futuro

O contrato usa tokens semânticos, portanto pode receber dark mode posterior sem trocar classes de componentes. Light é o único tema de produto nesta entrega; não se cria um modo escuro parcial.
