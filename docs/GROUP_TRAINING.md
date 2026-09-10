# Treino em Grupo

## Invariantes

- Há uma única `groupSession` por treino compartilhado; não há dois treinos independentes conciliados depois.
- O primeiro modo é `SAME_WORKOUT`; `PARALLEL_WORKOUTS` preserva contrato e fica sob flag.
- Estado de sessão (host, bloco/exercício atual, participantes, pausas, `startAt`) é compartilhado; performance e conclusão são individuais.
- O parceiro vê somente o que a configuração da sessão permitir. Uma adaptação pode ser visível como resultado operacional, nunca com razão médica/deficiência.

## Fluxo

```text
resolvePublicUserId (Function) → preview mínimo → invite → accept/decline
→ groupSession + participant docs → lobby/ready em realtime
→ host chama startGroupSession() → COUNTDOWN + startAt servidor
→ clientes derivam 3,2,1 do mesmo timestamp → activateGroupSession() seguro → treino + sets próprios
→ conclusão individual → processamento idempotente de estatísticas
```

## Autorização e estados

Convites: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `CANCELLED`. Participantes: roles `HOST`/`MEMBER`; status `INVITED`, `READY`, `ACTIVE`, `PAUSED`, `COMPLETED`, `LEFT`. A Function controla transições críticas. O host controla ordem, exercício, pausa e fim compartilhado; membros registram suas séries, ajustam carga e podem sair.

## Convites e antiabuso

O cliente nunca escreve em `trainingInvites`: `sendTrainingInvite` e `respondToTrainingInvite` são callables autenticadas com App Check que aplicam, nessa ordem, resolução do parceiro por WillTreino ID, bloqueio de autoconvite, checagem recíproca de `blockedUsers`, rate limit por remetente (`rateLimits/sendTrainingInvite`) e recusa de convite pendente duplicado dentro de uma transação. Aceitar um convite `PENDING` cria, na mesma transação, exatamente uma `groupSession` em `LOBBY` com o remetente como `HOST` e o destinatário como `MEMBER` `READY`; repetir a chamada retorna o mesmo `groupSessionId`. Recusar e cancelar são idempotentes e restritos a destinatário e remetente, respectivamente. A validade é derivada no servidor (`expiresAt` ISO, 48 h por padrão); convites vencidos são rejeitados no aceite, filtrados no cliente e varridos por `pruneExpiredTrainingInvites` — um gatilho agendado assume essa varredura em produção. Cada convite gera uma notificação in-app mínima (`notifications/{uid}/items`) com apenas nome e ID públicos; push FCM fica atrás de flag na Fase 19.

## Lobby

`/group/{groupSessionId}` usa listeners somente no documento da sessão e na subcoleção de participantes. O lobby mostra snapshots públicos mínimos (nome, avatar opcional e WillTreino ID), nunca UID, dados de saúde, acessibilidade, alimentação ou cargas. Cada pessoa pode marcar/desmarcar apenas o próprio `READY`; o host é o único a configurar compartilhamento de aparelhos, modo de estação e tempo de troca de carga.

As configurações são válidas apenas enquanto `status=LOBBY`: `FULL`/`PARTIAL`/`NONE`, `ROTATION_SHARED_STATION`/`PARALLEL_SAME_EXERCISE`/`INDEPENDENT_STATIONS` e troca `FAST`/`NORMAL`/`SLOW`/`CUSTOM` (1–120 s). A duração exibida é uma estimativa logística declarada como prévia e considera pessoas, estação e transições; a estimativa final usa a ficha efetivamente selecionada na engine de treino.

## Início sincronizado

`startGroupSession()` é callable, autenticada, com App Check e transação. Ela exige host, pelo menos dois participantes e todos em `READY`. Se já iniciada, retorna o estado atual com o mesmo `startAt`; caso contrário, define uma única vez `status=COUNTDOWN` e `startAt` cinco segundos após o horário do servidor. A UI nunca grava nem corrige esse valor e deriva a contagem por timestamp. Quando o horário chega, qualquer participante chama `activateGroupSession()`; a Function recusa chamadas antecipadas, verifica participação, troca uma única vez a sessão para `ACTIVE` e marca todos os participantes ativos. Repetições retornam o mesmo estado. O Emulator prova os dois `startAt` idênticos e a ativação idempotente.

## Rest Engine

Para um participante, `elapsedRecovery = now - lastSetCompletedAt` e `remainingRest = max(0, targetRest - elapsedRecovery)`. Tempo em que colegas executam e transições ocorrem conta como recuperação. `GroupRestEngine` recebe número de participantes, duração estimada da série, transição, troca de carga, modo de estação e último set por participante; ele devolve tanto o descanso real atual quanto a projeção até o próximo turno, sem adicionar um novo descanso cheio a cada rodada. O caso de três pessoas com séries de 40 s, transição de 15 s e alvo de 90 s projeta 110 s de recuperação antes de a primeira pessoa voltar.

Modos: `ROTATION_SHARED_STATION`, `PARALLEL_SAME_EXERCISE`, `INDEPENDENT_STATIONS`. Configuração de troca de carga pode ser rápida, normal, demorada ou personalizada e entra na previsão de duração. A estimativa também deriva a transição de estação pela combinação de equipamento compartilhado e modo: nenhuma em estações independentes/sem compartilhamento, reduzida em paralelo e maior no revezamento completo.

## Fila de turnos

`GroupTurnQueue` é uma engine pura. Recebe a lista ordenada de participantes (host primeiro no revezamento) e o modo de estação, produz turnos previsíveis e avança sem repetir ou perder pessoas. Para três participantes, a sequência é host → membro 1 → membro 2 → host, com número de rodada explícito. A fila não carrega dados pessoais nem performance individual.

## Sets individuais

Cada série concluída é um evento imutável em `groupSessions/{sessionId}/participants/{uid}/sets/{eventId}`. O `eventId` também é o ID do documento, é gerado antes da escrita e acompanha o evento em tentativas/reconexões. O repositório exige que o UID autenticado seja o mesmo do evento e envia `createdAt`/`updatedAt` como server timestamps. As Rules aceitam apenas criação, vinculam caminho, `eventId`, `id`, participante e sessão, e rejeitam update/delete — inclusive pelo próprio dono — para não sobrescrever histórico. O log bruto é privado: parceiro e host não leem cargas, repetições, RIR ou anotações por padrão.

## Status operacional em tempo real

O documento do participante tem uma projeção mínima e não sensível: `WAITING_TURN`, `PERFORMING_SET`, `RESTING` ou `PAUSED`, com timestamp do servidor. Participantes já inscritos recebem essa alteração pelo listener existente de participantes e podem atualizar somente o próprio estado quando a sessão está `ACTIVE`. Assim, alguém vê “João descansando” sem receber suas cargas, repetições, RIR, notas, saúde, acessibilidade ou o motivo de uma adaptação. A Function é a única responsável por ativar a sessão e seus participantes depois da contagem.

Quando o participante sai com `leaveGroupSession()`, o status passa a `LEFT`, o card de ação some da UI e novas séries ou atualizações operacionais desse participante são bloqueadas por Rules. O treino do restante do grupo continua intacto.

## Realtime, presença e offline

Listeners observam documento da sessão, participantes e eventos indispensáveis — nunca cronômetros por milissegundo. `GroupPresenceProvider` expõe `ONLINE`, `BACKGROUND`, `OFFLINE`, `RECONNECTING` como informação de UX; lógica crítica não depende apenas de presença. Ao reconectar, o cliente recupera `groupSessionId`, estado, próprios sets e timers pelos timestamps. Eventos possuem IDs para reconciliação sem sobrescrever ou duplicar sets.

O caminho de offline do grupo já possui fila local para séries concluídas: se a escrita falhar por erro recuperável de conexão, o evento fica persistido em `localStorage` com o mesmo `eventId` e é reenviado no retorno da conexão. Antes de reenviar, o cliente verifica se o documento já existe no Firestore para não duplicar evento que tenha sido confirmado pelo servidor mas retornado como erro ao navegador.

## Finalização e privacidade

A conclusão é individual e idempotente. `completeGroupParticipation()` é a única forma de fechar uma participação: a Function valida em transação que a pessoa está na sessão, que ela ainda não saiu e que a sessão está em andamento (`ACTIVE`/`PAUSED`), grava `status: "COMPLETED"` com `completedAt` do servidor e devolve o mesmo resultado quando repetida. As regras de encerramento vivem em `src/domain/group/group-completion.ts` (espelhadas em `functions/group-completion.js`): a sessão compartilhada só passa a `COMPLETED` quando ninguém mais está treinando e vira `CANCELLED` quando todo mundo saiu sem concluir. `leaveGroupSession()` aplica a mesma regra ao sair.

Nenhuma conclusão apaga o progresso alheio: os sets de cada participante continuam nos seus próprios caminhos e a pessoa que segue treinando não é interrompida. Depois de `COMPLETED`, as Rules congelam a participação — nada de novas séries nem de atualizações de estado operacional — do mesmo modo que já acontece após `LEFT`. A projeção de estatísticas por conclusão (ledger server-side, contagem semanal) pertence à Fase 14.

A privacidade é provada no Emulator: quem treina junto lê apenas o snapshot público do parceiro (nome, WillTreino ID, estado operacional) e nunca seus sets, perfil privado, saúde, condicionamento ou sessões solo; ninguém conclui a participação de outra pessoa, nem pelo cliente nem pelas Rules.
