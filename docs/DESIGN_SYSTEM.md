# WillTreino Design System — light-first

Fonte de verdade: `src/app/globals.css` (tokens `--wt-*`, expostos ao Tailwind v4 por `@theme inline`). Espelho tipado para uso em `style`: `src/config/design-tokens.ts`. Vitrine viva: rota `/design-system` (só fora de produção; responde 404 com `NEXT_PUBLIC_APP_ENV=production`).

Nenhum HEX fora de `globals.css` (exceção única: `themeColor` em `app/layout.tsx`, que precisa de literal). `src/config/color-contrast.test.ts` lê os blocos de tema e reprova qualquer par que saia do AA.

## Princípios

- Ação principal é azul; verde significa concluído/sucesso; âmbar é descanso/atenção; vermelho é erro ou risco; cinza é neutro.
- Estado nunca só por cor: sempre texto e/ou ícone/forma junto (badges, fila do treino, chips com check).
- Superfícies claras, bordas discretas; sombra só em card prioritário (`Card elevated`).
- Desktop planeja, mobile executa, tablet equilibra. Nenhuma informação essencial depende de hover, tooltip ou animação.

## Cores semânticas

| Token (`--wt-color-*`)       | Valor                             | Uso                                                  |
| ---------------------------- | --------------------------------- | ---------------------------------------------------- |
| `background`                 | `#F7F8FA`                         | fundo da aplicação                                   |
| `surface`                    | `#FFFFFF`                         | cartões e áreas de conteúdo                          |
| `surface-elevated`           | `#F1F4F8`                         | áreas neutras, trilhos, skeletons                    |
| `border` / `border-strong`   | `#E4E7EC` / `#CBD2DC`             | separação padrão / hover e controles                 |
| `text-primary`               | `#111827`                         | texto principal                                      |
| `text-secondary-strong`      | `#5F6F85`                         | texto auxiliar (AA em qualquer superfície clara)     |
| `text-secondary`             | `#64748B`                         | ícones e legendas sobre branco puro                  |
| `accent`                     | `#4F7CFF`                         | marca, barras, foco de seleção (não usar como texto) |
| `accent-hover`               | `#3D68E8`                         | fundo do CTA (texto branco a 4,83:1)                 |
| `accent-active`              | `#3458C7`                         | pressionado                                          |
| `accent-text`                | `#3458C7`                         | texto de marca: links, kicker, item ativo            |
| `accent-subtle` / `-border`  | `#EAF0FF` / `#C7D5FF`             | seleção (chips, tabs, navegação ativa)               |
| `success` / `-subtle`        | `#22C55E` / `#ECFDF3`             | ícones/barras de concluído                           |
| `success-text`               | `#15803D`                         | texto de sucesso                                     |
| `warning` / `-subtle`        | `#F59E0B` / `#FFF7E6`             | indicador de descanso                                |
| `warning-text`               | `#B45309`                         | texto de atenção                                     |
| `danger` / `-subtle`         | `#EF4444` / `#FEF2F2`             | ícones/bordas de erro                                |
| `danger-strong`              | `#DC2626`                         | fundo do botão destrutivo (texto branco a 4,83:1)    |
| `danger-text`                | `#B91C1C`                         | texto de erro                                        |
| `info` / `-subtle` / `-text` | `#0EA5E9` / `#F0F9FF` / `#0369A1` | informação contextual                                |

Regra: o tom base (`success`, `warning`, `danger`, `accent`) é para ícones, barras e bordas (3:1). Para texto use sempre a variante `-text`. O contraste de todos esses pares é testado nos três temas (claro, escuro futuro e alto contraste).

O gradiente `#4F7CFF → #7C6CFF` (`.wt-brand-gradient`, `.wt-gradient-text`) é exclusivo da marca: logo, "movimento." do hero e destaques excepcionais.

## Tipografia

Pilha sans do sistema (Inter quando disponível). Classes:

| Classe            | Uso                                             |
| ----------------- | ----------------------------------------------- |
| `wt-text-display` | hero da landing                                 |
| `wt-text-h1`      | título da página (um `h1` por tela)             |
| `wt-text-h2`      | título de seção (`SectionHeader`)               |
| `wt-text-h3`      | título de card/lista                            |
| `wt-text-body`    | texto corrido                                   |
| `wt-text-label`   | rótulo de campo                                 |
| `wt-text-caption` | legenda e apoio                                 |
| `wt-text-metric`  | números de treino (algarismos tabulares)        |
| `wt-tabular`      | algarismos tabulares em qualquer texto (timers) |

Pesos usados: 400, 500, 600, 700, 750/800 (só métricas e display). Números importantes ganham destaque por tamanho e peso, não por cor.

## Espaço, raio, sombra, camadas e movimento

- Espaço: escala do Tailwind (4 px). Ritmo padrão: 8/12/16/24/32 px.
- Raios: `sm` 8, `md` 12 (botões, campos), `lg` 16 (blocos internos), `card` 20 (cards), `xl` 24 (sheets/diálogos), `hero` 28, `full`.
- Sombras: `shadow-wt-surface` (card prioritário), `shadow-wt-elevated` (sheets, diálogos, toasts), `shadow-wt-bar` (navegação inferior). Nunca glow.
- Camadas: `--wt-z-sticky` 20, `--wt-z-nav` 30, `--wt-z-overlay` 40, `--wt-z-modal` 50, `--wt-z-toast` 60.
- Movimento: 150/200/250 ms, só `opacity`/`transform` (`wt-pop-in`, `wt-step-in`, `wt-sheet-in`, `wt-fade-in`). `prefers-reduced-motion` desliga tudo sem perder função.
- Containers: `form` 36rem, `reading` 48rem, `app` 72rem (padrão de `.wt-page`), `wide` 80rem.
- `--wt-mobile-nav-height` (4,25rem) reserva o espaço da navegação inferior; CTAs fixos no mobile somam essa altura à área segura.

## Componentes (`src/components`)

| Componente                                 | Notas                                                                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button` / `buttonVariants`                | `primary`, `secondary`, `tonal`, `outline`, `ghost`, `success`, `danger`; tamanhos `default`, `large`, `xl` (CTA de treino, 56 px), `icon` (44 px); `loading` anuncia e bloqueia duplo clique. `buttonVariants` estiliza `Link` como botão. |
| `Input`, `Textarea`, `Select`              | label sempre visível, `hint`, erro adjacente com `role="alert"`, `unit` dentro do campo.                                                                                                                                                    |
| `NumberStepper`                            | − / + grandes para carga/reps/RIR; `input` continua editável com teclado numérico; `step="any"` para o passo dos botões não virar validação nativa.                                                                                         |
| `SegmentedControl`                         | escolha única curta (radios reais); `layout="track"` ou `"wrap"`.                                                                                                                                                                           |
| `OptionCards`                              | escolha única com descrição (onboarding).                                                                                                                                                                                                   |
| `ChoiceChips`                              | múltipla escolha com check visível (equipamentos, adaptações).                                                                                                                                                                              |
| `Badge`                                    | estado curto: `neutral`, `accent`, `success`, `warning`, `danger`, `info` + ícone opcional.                                                                                                                                                 |
| `ProgressBar`                              | `role="progressbar"` com `valueText` legível.                                                                                                                                                                                               |
| `Metric` / `MetricGrid`                    | par `dt`/`dd` para números importantes.                                                                                                                                                                                                     |
| `Card`                                     | neutro por padrão (só borda); `elevated` para o prioritário; `as` evita landmarks demais.                                                                                                                                                   |
| `Dialog`                                   | confirmação de ação destrutiva; foco preso e devolvido.                                                                                                                                                                                     |
| `Sheet`                                    | bottom sheet no mobile, diálogo centralizado a partir de `sm`.                                                                                                                                                                              |
| `Disclosure`                               | `<details>` nativo para revelação progressiva (técnica, observações, zona de perigo).                                                                                                                                                       |
| `EmptyState`, `ErrorState`, `LoadingState` | vazio com próxima ação; erro com "tentar novamente" (e ação alternativa); skeleton no formato do conteúdo.                                                                                                                                  |
| `Toast`                                    | acima da navegação inferior no mobile, no canto no desktop. Usar com moderação.                                                                                                                                                             |
| `Avatar`                                   | iniciais do nome público (decorativo).                                                                                                                                                                                                      |
| `PageHeader`, `SectionHeader`              | anatomia padrão: título, descrição, ações.                                                                                                                                                                                                  |
| `Logo`, `LogoMark`                         | única implementação da marca WT.                                                                                                                                                                                                            |
| `AppShell`, `DesktopNav`, `MobileNav`      | sidebar ≥ 1024 px, barra inferior abaixo disso (nunca as duas).                                                                                                                                                                             |

## Navegação

- Mobile (5 itens): Início, Treino, Cardio, Evolução, Conta. Alimentação fica nos atalhos do Início e na Conta.
- Desktop: **Treinar** (Início, Treino, Cardio) · **Acompanhar** (Evolução, Alimentação) · rodapé: Conta.
- `matches` marca áreas relacionadas: `/group/*` ativa "Treino"; `/onboarding` ativa "Conta".

## Layout e breakpoints

- Mobile < 768 px: fluxo vertical, bottom nav, sheets, CTAs `xl` fixos acima da barra.
- Tablet 768–1023 px: duas colunas só onde a leitura melhora (formulários, métricas).
- Desktop ≥ 1024 px: sidebar de 240 px e grades de duas colunas (treino + sequência, início + semana).
- Breakpoints representam mudança de estrutura, nunca um aparelho específico.

## Escrita

Termos fixos: Treino, Exercício, Série, Repetições, Carga, Descanso, Cardio, WillTreino ID. Frases curtas e humanas; plural correto (sem "(s)"); nenhum erro cru do Firebase ou identificador técnico (UID, id de documento, enum, fuso IANA) na tela.
