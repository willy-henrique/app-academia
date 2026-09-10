# Cardio

## Modelo

`src/domain/cardio/cardio.ts` define a prescrição e a sessão de cardio como domínio puro:

- **Exigência**: `OPTIONAL`, `RECOMMENDED` ou `PROGRAM_REQUIRED`, cada uma com alvo padrão (10, 15 e 20 minutos) que pode ser sobrescrito pelo plano.
- **Modalidade e intensidade**: caminhada, corrida, bicicleta, remo, elíptico, escada ou outro; intensidade baixa, moderada ou alta.
- **Sessão**: `cardioSessions/{id}` com dono, prescrição, status (`PLANNED`, `ACTIVE`, `COMPLETED`, `SKIPPED`, `RESCHEDULED`), duração, distância opcional, motivo do pulo, reagendamento e origem (`STANDALONE` ou `WORKOUT`, com `workoutSessionId`).

## Cardio não bloqueia força

`blocksStrengthCompletion()` é explicitamente `false`: a sessão de força fecha por conta própria e nada no fluxo de cardio a altera. Uma pessoa pode iniciar o cardio quando quiser (`/cardio`), inclusive depois de encerrar a força — o resumo da sessão solo leva para lá.

## Pular e reagendar

Pular exige motivo (`skipCardioSession`) e registra `skippedAt` com o texto informado; as Rules recusam um documento `SKIPPED` sem motivo. Um cardio obrigatório também pode ser pulado — ninguém fica preso sem conseguir encerrar o treino —, mas o pulo é registrado como pulo e nunca conta como feito. Reagendar (`rescheduleCardioSession`) exige horário futuro, mantém o cardio pendente e jamais o marca como concluído, para não falsear a adesão.

## Métricas separadas

O evento semanal carrega `kind: "STRENGTH" | "CARDIO"`. Um cardio concluído credita `cardioSessions` e `cardioSeconds` e **não** entra em `completedWorkouts`, `soloWorkouts`, `plannedWorkouts` nem `extraWorkouts`. Pular o cardio não reduz nenhuma métrica de força nem a adesão ao plano. O crédito é feito pela callable `recordCardioCompletion({ cardioSessionId })`, com o mesmo ledger `processedEvents` (`cardio:{sessionId}:{uid}`), e o `rebuildWeeklyStats` reconstrói força e cardio da mesma semana.

## Privacidade

`cardioSessions` é owner-only em leitura e escrita, com forma validada nas Rules (chaves permitidas, status, duração inteira não negativa, exigência válida e motivo obrigatório ao pular). Nenhum parceiro de treino vê cardio alheio.

## Testes

Unit: níveis de exigência, conclusão idempotente com duração/distância, pulo com motivo obrigatório (inclusive obrigatório), reagendamento futuro e recusa de mover sessão fechada, independência da sessão solo. RTL: iniciar, concluir com crédito semanal, pular exigindo motivo e reagendar mantendo pendente. Emulator: `cardioSessions` privada e validada, crédito único do cardio, retry sem dupla contagem e rebuild reconstruindo força e cardio.
