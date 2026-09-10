# Checklist de Produção

Estado em 2026-09-09. `OK` = verificado com evidência nesta base de código. `PENDENTE` = depende de acesso ao projeto Firebase/GCP ou de ferramenta ainda não instalada. Nenhum item é marcado sem evidência.

## Qualidade e testes

| Item                             | Estado   | Evidência                                                                 |
| -------------------------------- | -------- | ------------------------------------------------------------------------- |
| Formatação                       | OK       | `npm run format:check`                                                    |
| Lint                             | OK       | `npm run lint`                                                            |
| Tipos                            | OK       | `npm run typecheck`                                                       |
| Testes unitários e de componente | OK       | `npm test`                                                                |
| Integração + Rules no Emulator   | OK       | `npm run test:emulator`                                                   |
| Build de produção                | OK       | `npm run build`                                                           |
| Smoke de deploy                  | OK       | `npm run smoke -- <url>` (validado contra o servidor local)               |
| E2E com dois navegadores         | PENDENTE | Playwright não instalado; o cenário A/B equivalente é coberto no Emulator |

## Segurança

| Item                                    | Estado   | Evidência                                                          |
| --------------------------------------- | -------- | ------------------------------------------------------------------ |
| Deny by default em Firestore e Storage  | OK       | Teste de regressão sobre coleções sem regra                        |
| Privacidade entre parceiros de treino   | OK       | Emulator (sets, perfis, saúde e sessões solo negados)              |
| Projeções e ledger server-writable only | OK       | Emulator (`weeklyStats`, `processedEvents`)                        |
| Rate limit em endpoints sensíveis       | OK       | `resolvePublicUserId`, `sendTrainingInvite`, `rebuildWeeklyStats`  |
| CSP e headers de segurança              | OK       | `src/config/security-headers.ts` + verificado por HTTP             |
| Validação de upload                     | OK       | Storage Rules (imagem, 10 MB, caminho do dono)                     |
| Auditoria de dependências               | OK       | 16 moderadas, todas de servidor/tooling — triagem em `SECURITY.md` |
| App Check com enforcement               | PENDENTE | Código pronto; ativar no console (ver `OPERATIONS.md`)             |
| Revisão de IAM                          | PENDENTE | Requer acesso ao projeto                                           |
| Publicação de Rules e índices           | PENDENTE | Nunca publicados em projeto remoto                                 |

## Privacidade (LGPD)

| Item                               | Estado   | Evidência                                  |
| ---------------------------------- | -------- | ------------------------------------------ |
| Exportação dos próprios dados      | OK       | `exportAccountData` + Emulator             |
| Exclusão da conta com confirmação  | OK       | `deleteAccountData` + Emulator             |
| Preservação do treino de terceiros | OK       | Participação anonimizada em vez de apagada |
| Minimização em logs e notificações | OK       | Notificação de convite sem plano nem carga |
| Política de privacidade publicada  | PENDENTE | Texto jurídico é decisão do produto        |

## Acessibilidade

| Item                                | Estado   | Evidência                                               |
| ----------------------------------- | -------- | ------------------------------------------------------- |
| Contraste AA nos três temas         | OK       | `color-contrast.test.ts`                                |
| Skip link e landmarks               | OK       | `app-shell.test.tsx`                                    |
| Movimento reduzido                  | OK       | `globals.css` (`prefers-reduced-motion`)                |
| Alvos de toque ≥ 44 px e zoom 200%  | OK       | `min-h-11` nas primitivas; viewport sem `maximum-scale` |
| Cronômetro com anúncio adequado     | OK       | `role="timer"` + número `aria-hidden`                   |
| Auditoria manual com leitor de tela | PENDENTE | Roteiro abaixo                                          |

Roteiro manual mínimo antes do lançamento: percorrer login → onboarding → treino solo → convite → lobby → treino em grupo → resumo usando apenas teclado; repetir com NVDA (Windows) ou VoiceOver (iOS); repetir com zoom em 200% numa largura de 375 px; repetir com "reduzir movimento" ligado no sistema.

## Performance

| Item                              | Estado   | Evidência                               |
| --------------------------------- | -------- | --------------------------------------- |
| Baseline de bundle registrado     | OK       | `PERFORMANCE.md`                        |
| Sem N+1 conhecido por tela        | OK       | `PERFORMANCE.md`                        |
| Listeners restritos ao necessário | OK       | Apenas lobby de grupo                   |
| Carregamento dinâmico de gráficos | OK       | `next/dynamic` no `/dashboard`          |
| Lighthouse / Core Web Vitals      | PENDENTE | Exige deploy; metas em `PERFORMANCE.md` |

## Operação

| Item                     | Estado   | Evidência                    |
| ------------------------ | -------- | ---------------------------- |
| Passo a passo de release | OK       | `OPERATIONS.md`              |
| Plano de rollback        | OK       | `OPERATIONS.md`              |
| Estratégia de backup     | OK       | `OPERATIONS.md`              |
| Drill de restauração     | PENDENTE | Executar em projeto de teste |
| Alertas e error tracking | PENDENTE | Configurar no console        |

## Definition of Done do produto

O cenário ponta a ponta — duas contas, onboarding, convite, lobby, início sincronizado com o mesmo `startAt`, séries privadas, cardio independente, encerramento idempotente e estatísticas para as duas pessoas — passa hoje na Emulator Suite. Falta reproduzi-lo em Playwright com dois navegadores reais e fechar os itens `PENDENTE` acima antes de considerar o lançamento aprovado.
