# Acessibilidade

## Meta

WCAG 2.2 AA é o padrão de aceitação. Design é mobile-first (375, 390 e 430 px) e não pressupõe capacidade física, visual, auditiva, cognitiva ou conectividade constante.

## Dados e privacidade

O onboarding pergunta de forma opcional sobre necessidade de adaptação: não, sim ou prefiro não responder. Quando houver resposta, registra necessidades, movimentos confortáveis/difíceis, preferências a evitar, apoios, equipamento adaptado e orientação específica em `accessibilityProfiles/{uid}`. Esses dados são privados; a engine usa-os para selecionar uma versão adaptada e apenas o resultado necessário pode aparecer ao parceiro.

## Primitivas e critérios de UI

- Navegação completa por teclado, ordem de foco lógica e foco sempre visível.
- Semântica HTML primeiro; labels associadas, mensagens de erro anunciáveis e regiões ao vivo somente para mudanças relevantes.
- Contraste AA, tokens de cor sem informação dependente somente de cor e alvos de toque adequados.
- Respeitar `prefers-reduced-motion`; animação não é requisito para compreender ou concluir uma ação.
- Texto suporta zoom/font scaling sem perda de conteúdo ou controles.
- Modo alto contraste e modo simplificado reduzem ruído sem remover ações essenciais.
- Vídeos sem autoplay com som, com legenda, descrição acessível e instruções textuais de técnica.
- Timer oferece feedback visual; som, vibração e notificações são opcionais, não únicos meios de aviso.

## Domínio

`evaluateExerciseCompatibility()` retorna `COMPATIBLE`, `ADAPTATION_REQUIRED`, `REVIEW_REQUIRED` ou `NOT_RECOMMENDED`, com `reasonCodes` internos. Não diagnostica, não infere capacidade por rótulo e não substitui orientação profissional. A Safety Engine usa linguagem de precaução e encaminhamento, não diagnóstico.

## Testes

Cada feature acrescenta testes de teclado, labels/roles, foco em dialogs, contraste/tokens quando aplicável, reduced motion e viewport móvel. Fluxos críticos de treino solo/grupo terão cobertura por leitor de tela simulada/RTL e Playwright; auditoria manual faz parte da Fase 25.

## Auditoria da Fase 25 (2026-09-09)

### Corrigido nesta auditoria

| Achado                                                                                      | Correção                                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `SkipLink` existia desde a Fase 2 mas não estava montado em lugar nenhum                    | Passou a ser o primeiro elemento focável do `AppShell`, apontando para `#main-content`     |
| Borda de campo no tema escuro tinha 1,57:1 contra a superfície (limite visível de controle) | Token `--wt-color-border` do tema escuro subiu para 3,25:1 ou mais em todas as superfícies |
| No tema claro o acento tinha 1,91:1 — e ele também é cor de link e de botão primário        | Tema claro ganhou acento, sucesso, alerta, perigo e foco próprios, todos ≥ 4,5:1           |
| Texto branco sobre o acento claro ficava em 1,91:1 no botão primário                        | `accent-foreground` claro sobre o novo acento fica em 5:1                                  |
| `prefers-reduced-motion` desligava só a animação de skeleton                                | Passou a zerar animações, transições e `scroll-behavior` globalmente, sem perda de função  |
| Cronômetro de descanso atualizava a cada 250 ms sem anúncio de conclusão                    | Número virou `aria-hidden` e um `role="timer"` anuncia o estado, sem inundar o leitor      |

### Verificação automatizada

`src/config/color-contrast.test.ts` converte os tokens `oklch` para sRGB e falha se qualquer par crítico cair abaixo de AA — texto principal e secundário sobre fundo/superfícies (4,5:1), acento, foco, perigo e bordas (3:1) e o texto do botão primário sobre o acento (4,5:1) — nos três temas (escuro, claro e alto contraste). Uma mudança de cor que quebre a acessibilidade passa a falhar no `npm test`.

Alvos de toque: `Button`, `Input`, links de navegação e o `SkipLink` usam `min-h-11` (44 px), acima do mínimo AA de 24×24 px e alinhados ao recomendado de 44×44 px. O `viewport` não define `maximum-scale` nem `user-scalable=no`, então o zoom até 200% continua disponível.

### Pendente de auditoria manual

Teclado ponta a ponta, leitor de tela real (NVDA/VoiceOver), zoom a 200% em 375 px e verificação do fluxo de grupo com duas contas continuam como checklist manual — o projeto ainda não tem Playwright instalado, então não há automação de E2E para esses passos. O roteiro está em [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).
