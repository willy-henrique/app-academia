# Auditoria de UI/UX — WillTreino

Data: 2026-09-10  
Escopo: Web App Next.js/App Router; auditoria de código, rotas, componentes, estados e execução local. Não altera regras de domínio, Firebase ou Security Rules.

## 1. Estado atual

O produto é um monólito modular em Next.js 16, React 19, TypeScript e Firebase. As rotas públicas são `/`, `/login`, `/signup`, `/forgot-password`, `/verify-email` e `/offline`; as autenticadas são `/dashboard`, `/workout`, `/cardio`, `/food`, `/account`, `/onboarding` e `/group/[sessionId]`.

Os domínios existentes cobrem autenticação, onboarding, treino, cardio, treino em grupo, identidade pública, perfil, progressão, nutrição e sincronização offline. A lógica está majoritariamente separada de componentes React em `domain/`, `features/` e `infrastructure/`, e essa separação deve ser preservada.

O design atual usa Tailwind v4 e tokens `--wt-*` em `src/app/globals.css`. Há primitives reutilizáveis para botão, input, select, card, dialog, toast, skeleton, option cards, navegação e acessibilidade.

## 2. Problemas encontrados

- A interface principal é dark-first, verde e com alto uso de glow, grade de fundo, gradientes e sombras; isso conflita com a direção fitness leve e premium solicitada.
- `accent` é usado tanto como ação, destaque decorativo e marca de sucesso, portanto a semântica de cor não é previsível.
- Cards aninhados, linhas decorativas e superfícies muito contrastadas aumentam a densidade visual sem melhorar a decisão do usuário.
- A landing apresenta uma boa narrativa, mas o preview usa o mesmo tratamento cyber/escuro da aplicação e exagera em efeitos decorativos.
- O treino ativo ainda mostra técnica, mídia e formulário completo juntos em mobile; a ação principal não domina suficientemente a tela.
- O convite de treino acompanhado existia mas não estava conectado à sessão ativa; foi conectado durante a auditoria e permanece coberto por teste.

## 3. Inconsistências

- Tokens existentes nomeiam `surface-elevated` e `accent`, mas não incluem variantes semânticas claras (`primary-subtle`, `warning-subtle`, `success-subtle`, etc.).
- Alguns componentes aplicam cores e sombras literais em classes Tailwind, criando acoplamento com o tema antigo.
- `Card` adiciona pseudo-elementos e sombras em todos os usos; cards simples e cards prioritários não têm hierarquia suficiente.
- Desktop usa barra horizontal, enquanto o produto precisa de uma área de planejamento mais estável; a futura sidebar deve coexistir com a bottom navigation, sem duplicar navegação por viewport.
- A área protegida pode ficar visualmente vazia enquanto a sessão Firebase carrega; isso foi corrigido com estado de carregamento acessível.

## 4. Componentes duplicados ou faltantes

Não há duplicação estrutural crítica entre `Button`, `Input`, `Card` e `Select`. O problema é a falta de primitives de feedback e composição para impedir implementações ad hoc nas páginas.

Faltam, ou precisam ser consolidados, `PageHeader`, `SectionHeader`, `StatusBadge`, `Metric`, `EmptyState`, `ErrorState`, `LoadingState`, `ProgressBar`, `IconButton`, `Textarea`, `Tabs`, `Chip` e um container de ação sticky para treino mobile. Eles devem ser criados somente quando uma migração de página os consumir.

## 5. Mobile

- A bottom navigation já tem alvo de toque e safe area, mas usa cinco itens de mesmo peso e não deixa explícita a ação central de treino.
- Treino, cardio e onboarding já usam inputs nativos, porém precisam de melhor agrupamento para uma mão e teclado aberto.
- O layout móvel deve reduzir conteúdo simultâneo no treino ativo: exercício, progresso, carga/reps/RIR e CTA primeiro; técnica e fila em disclosure/drawer.
- Todos os breakpoints de referência serão validados em 375, 390, 430, 768, 1024, 1280 e 1440 px com Playwright.

## 6. Desktop

- A barra horizontal consome pouco espaço, mas não cria a área de trabalho adequada para planejamento, histórico e evolução.
- As páginas têm `max-width` coerente, mas a grade decorativa é repetida e não ajuda leitura em telas grandes.
- Dashboard e progresso precisam de hierarquia editorial: próximo treino primeiro, resumo semanal depois e gráficos somente quando respondem uma pergunta.

## 7. Acessibilidade

Pontos positivos: labels visíveis, `aria-invalid`, live regions, skip link, foco visível, reduced motion e alvos mínimos já existem.

Pontos a revisar durante cada migração: contraste da nova paleta, foco em chips/tabs, ordem de tabulação em navegação, estados não dependentes somente de cor, textos de timer sem anúncios excessivos e sticky CTA sem cobrir conteúdo ou navegação móvel.

## 8. Navegação e arquitetura da informação

Navegação atual: Resumo, Treino, Cardio, Alimentos e Conta. Ela é funcional, mas não dá acesso explícito a histórico, exercícios e evolução como destinos de primeira classe. A auditoria não cria rotas fictícias: os destinos só entram na navegação quando a tela correspondente existir.

Decisão inicial: manter rotas existentes, usar `/dashboard` como início, `/workout` como treino, manter cardio/nutrição como áreas de acompanhamento e agrupar itens secundários em Conta. A sidebar desktop será introduzida sobre esse contrato, sem mudar URLs.

## 9. Design system

O sistema atual é tecnicamente centralizado, mas visualmente está orientado ao escuro/neon. A fundação será migrada para light-first com azul como ação e verde reservado a sucesso. Tokens serão a única fonte de cor, raio, sombra, tipografia, motion, z-index, breakpoints e containers. Não haverá conversão mecânica de toda a UI em branco/azul: cada página será migrada depois que primitives e estados estiverem prontos.

## 10. Plano de redesign por tarefas

| Task   | Objetivo                                                | Risco                               | Validação                                      |
| ------ | ------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| UI-001 | Registrar auditoria e inventário de rotas/componentes   | baixo                               | revisão documental                             |
| UI-002 | Definir tokens light-first e contrato de tema           | médio: contraste global             | unit de tokens, lint, typecheck, build         |
| UI-003 | Refatorar CSS base, tipografia, card, botão e input     | médio: regressão visual transversal | RTL, Playwright de auth, breakpoints           |
| UI-004 | Criar primitives de feedback e headers de página        | baixo                               | RTL/a11y                                       |
| UI-005 | Migrar landing e autenticação                           | médio: conversão e formulários      | E2E de cadastro/login                          |
| UI-006 | Migrar shell, navegação e dashboard                     | médio: rotas e viewport             | RTL/Playwright em mobile e desktop             |
| UI-007 | Migrar onboarding                                       | médio: formulário longo/autosave    | RTL e fluxo autenticado                        |
| UI-008 | Migrar treino solo, timer, descanso, cardio e conclusão | alto: ação crítica de treino        | unit de engine + E2E local                     |
| UI-009 | Migrar convite, lobby e sessão de grupo                 | alto: realtime/privacidade          | Rules Emulator e testes de grupo               |
| UI-010 | Migrar evolução, nutrição e perfil                      | médio: densidade e estados vazios   | RTL, Playwright, Rules relevantes              |
| UI-011 | Polimento responsivo, a11y, performance e cópia         | médio                               | lint, typecheck, unit, integration, build, E2E |

Cada task atualiza `IMPLEMENTATION_STATUS.md`; nenhuma troca visual modifica cálculos, coleções, Cloud Functions ou regras de autorização sem uma task de domínio separada.
