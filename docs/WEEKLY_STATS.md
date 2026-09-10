# Estatísticas Semanais

## Semana da pessoa, não do servidor

A semana é sempre resolvida no fuso e na preferência da própria conta: `privateProfiles/{uid}.timezone` e `privateProfiles/{uid}.preferences.weekStartsOn` (padrão brasileiro: `America/Sao_Paulo`, semana começando na segunda). `src/domain/progression/week-key.ts` — espelhado em `functions/week-key.js` para o servidor — devolve a janela `{ key, startsAt, endsAt }`, onde `key` é a data local do primeiro dia da semana (`YYYY-MM-DD`). O limite é a meia-noite local mesmo em semanas com mudança de horário de verão, e a mesma janela é usada pelo cliente, pelo crédito e pelo rebuild.

## Projeção e fonte de verdade

`weeklyStats/{uid}/weeks/{weekKey}` é uma projeção **server-writable only**: o dono lê, nenhum cliente escreve. A fonte de verdade continua sendo `workoutSessions/{sessionId}` (sessão solo concluída) e `groupSessions/{id}/participants/{uid}` com seus `sets` (participação em grupo concluída). O engine puro `src/domain/progression/weekly-stats.ts` (espelhado em `functions/weekly-stats.js`) soma treinos concluídos, treinos do plano, extras, treinos em grupo, cardio, séries, repetições e volume.

## Adesão e treinos extras

Um treino é `PLANNED` quando a sessão aponta para o plano ativo da conta (`privateProfiles/{uid}.activeWorkoutPlanId`) e `EXTRA` caso contrário — a classificação é feita no servidor, nunca enviada pelo cliente. A adesão conta somente treinos do plano, limitada à meta semanal declarada no onboarding (`routine.daysPerWeek`): treino extra nunca infla adesão e aparece separado como `+n`.

## Idempotência

Cada conclusão vira um evento com id determinístico: `solo:{sessionId}:{uid}` ou `group:{sessionId}:{uid}`. O ledger `processedEvents/{eventId}` é server-only e gravado na mesma transação que atualiza a projeção; repetir o comando (clique duplo, retry, reconexão) devolve o mesmo resultado sem somar duas vezes. Em grupo, cada participante é creditado pela própria chamada de `completeGroupParticipation`, com seus próprios totais: A e B recebem um treino cada.

## Cardio

O evento carrega `kind: "STRENGTH" | "CARDIO"`. Cardio credita `cardioSessions` e `cardioSeconds` sem entrar em `completedWorkouts`, `soloWorkouts`, `plannedWorkouts` ou `extraWorkouts`; pular cardio não reduz nenhuma métrica de força. Detalhes em [CARDIO.md](CARDIO.md).

## Comandos

- `recordWorkoutCompletion({ sessionId })` — credita uma sessão solo já concluída, validando dono e status no servidor.
- `completeGroupParticipation({ sessionId })` — encerra a participação em grupo e credita a semana da pessoa na mesma transação.
- `recordCardioCompletion({ cardioSessionId })` — credita um cardio concluído no eixo de cardio da semana.
- `rebuildWeeklyStats({ weekKey })` — recalcula a semana a partir das sessões, participações e cardios concluídos e regrava ledger e projeção.

## Dashboard

`/dashboard` lê um documento para a semana atual e uma página das oito semanas anteriores (`orderBy weekKey desc`) — sem N+1 por sessão. O card mostra treinos do plano sobre a meta, extras como `+n`, treinos em grupo, volume, adesão e o fuso considerado; estados de carregamento e erro são anunciados por `LiveRegion`. Recalcular a semana chama o rebuild e relê a projeção.

## Testes

Unit: janela de semana por fuso, domingo/segunda, virada de horário de verão, limites de início/fim e histórico; engine de adesão, extras, grupo, cardio, deduplicação por `eventId` e isolamento por usuário. RTL: dashboard com números reais, semana vazia, semanas anteriores e recálculo. Emulator: crédito individual em grupo para cada participante, retry sem dupla contagem, rebuild a partir da fonte de verdade e Rules negando escrita client-side em `weeklyStats` e qualquer acesso a `processedEvents`.
