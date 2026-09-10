# Modelo de Dados e Access Patterns

## Convenções

- UID é chave interna de documentos e nunca é exposto como identificador público de produto.
- Dinheiro é inteiro em centavos (`priceCents`, `budgetCents`); nunca `float`.
- Timestamps são gerados pelo servidor onde ordem, segurança ou auditoria importam.
- Coleções de agregados, índices, roles, auditoria e eventos processados são escritas exclusivamente pelo servidor.
- Cada schema será validado em runtime por Zod (ou equivalente) no limite client/server correspondente.

## Perfis separados

| Documento                          | Conteúdo permitido                                                                                                            | Escrita                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `publicProfiles/{uid}`             | `publicUserId`, displayName, avatar, username opcional, nível/badges explicitamente públicos                                  | servidor para ID; dono para campos permitidos |
| `privateProfiles/{uid}`            | nascimento, locale, timezone, rascunho/versionamento de onboarding, preferências, metadados e ponteiros da sessão/plano ativo | dono restrito                                 |
| `fitnessProfiles/{uid}`            | objetivos, experiência, rotina, equipamento e preferências de treino                                                          | dono restrito                                 |
| `healthProfiles/{uid}`             | informações de saúde/autodeclaração e consentimentos                                                                          | dono; acesso operacional mínimo pelo servidor |
| `accessibilityProfiles/{uid}`      | necessidades, capacidade funcional, restrições e adaptações                                                                   | dono; nunca parceiro                          |
| `nutritionProfiles/{uid}`          | preferências e orçamento alimentar                                                                                            | dono; nunca parceiro                          |
| `userSettings/{uid}`               | privacidade, notificações, semana e simplificação de UI                                                                       | dono restrito                                 |
| `publicUserIdIndex/{normalizedId}` | referência interna para resolução controlada                                                                                  | somente servidor                              |

O índice não é consultável pelo client. `resolvePublicUserId()` devolve somente preview permitido: nome, avatar, WillTreino ID e estado básico de conta.

## Treino e grupo

| Recurso            | Caminho conceitual                                                         | Notas de consistência                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catálogo           | `exercises/{exerciseId}`, `exerciseAdaptations/{id}`, `exerciseMedia/{id}` | conteúdo curado/admin; licença e atribuição obrigatórias                                                                                                     |
| Plano              | `workoutPlans/{planId}/versions/{versionId}`                               | versões imutáveis; sessão aponta para a versão usada                                                                                                         |
| Sessão solo        | `workoutSessions/{sessionId}` e sets sob sessão/usuário                    | dono escreve próprios dados; eventos têm ID                                                                                                                  |
| Convite            | `trainingInvites/{inviteId}`                                               | sender/receiver leem; escrita só via Function; `createdAt`/`updatedAt` são server timestamps e `expiresAt` é ISO derivado no servidor                        |
| Bloqueios          | `blockedUsers/{ownerUid}/blocked/{blockedUid}`                             | só o dono gerencia; Functions leem para barrar convites                                                                                                      |
| Notificações       | `notifications/{uid}/items/{notificationId}`                               | Function cria; dono só lê e alterna `readAt`; sem dados sensíveis                                                                                            |
| Sessão de grupo    | `groupSessions/{sessionId}`                                                | host, plano/versionamento, estado, configuração logística e `startAt` autoritativo                                                                           |
| Participante       | `groupSessions/{id}/participants/{uid}`                                    | snapshot público mínimo, role, estado e sinal operacional (`WAITING_TURN`/`PERFORMING_SET`/`RESTING`); cada participante só altera o próprio sinal permitido |
| Sets de grupo      | `groupSessions/{id}/participants/{uid}/sets/{eventId}`                     | evento imutável, dono cria/lê somente o próprio; `eventId` = id do documento e evita duplicação em retries/offline                                           |
| Parceiros recentes | `recentTrainingPartners/{uid}/items/{partnerUid}`                          | snapshot público mínimo; não é amizade implícita                                                                                                             |

## Métricas e histórico

`weeklyStats/{uid}/weeks/{weekKey}` é uma projeção por usuário e timezone: o dono lê, somente o servidor escreve. A fonte de verdade são sessões e eventos concluídos. `processedEvents/{eventKey}` (server-only) evita dupla contagem em Functions/retries, com ids determinísticos `solo:{sessionId}:{uid}` e `group:{sessionId}:{uid}`. O rebuild existe como callable `rebuildWeeklyStats({ weekKey })`, que recalcula a semana a partir das sessões e participações concluídas. Detalhes em [WEEKLY_STATS.md](WEEKLY_STATS.md).

O onboarding progressivo salva rascunho autoritativo em `privateProfiles/{uid}.onboarding`, com `currentStepId`, `completedStepIds` e respostas do wizard. A tela de onboarding lê esse rascunho para retomar exatamente de onde o usuário parou. Os ponteiros `activeWorkoutPlanId` e `activeWorkoutSessionId` permitem retomar somente a sessão solo do próprio usuário, sem duplicar histórico.

## Nutrição e conteúdo

`foods`, `foodPrices`, `recipes`, `mealPlans`, `foodLogs` e `shoppingLists` usam ownership explícito. O catálogo `foods` mantém `nutritionPer100g`, porção padrão com massa conhecida ou `null`, e `source` com provider, atribuição, confiança, licença/URL/id externo e data de coleta. Valores de fibra/sódio desconhecidos permanecem `null`; macros/calorias são aproximados e não viram recomendação clínica. Preços incluem região, loja, unidade normalizada, origem, confiança e `collectedAt`; dados ausentes não podem ser apresentados como atuais. Providers externos ficam atrás de porta `FoodProvider`.

O diário usa `foodLogs/{uid}/entries/{entryId}`. Cada entrada pertence ao dono do caminho e guarda `consumedAt`, refeição, quantidade em gramas, notas opcionais, macros aproximados e um snapshot mínimo do alimento (nome, porção, provider e confiança). O snapshot preserva o histórico quando o catálogo muda; parceiro de treino não lê nem escreve esse caminho. Detalhes em [NUTRITION.md](NUTRITION.md).

## Administração e segurança

`adminRoles`, `subscriptionState`, `auditLogs`, `featureFlags` e `processedEvents` não recebem escrita do client. Claims e mutações administrativas são mantidas por Function autorizada. Fotos privadas seguem `avatars/{uid}`, `progress/{uid}` e `user-content/{uid}` no Storage; `progress` é privado.

## Access patterns iniciais

| Necessidade        | Consulta/shape projetado                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home               | perfil mínimo + plano atual/sessão ativa + projeção semanal do próprio usuário                                                                                                                                                |
| Últimos 20 treinos | query por `ownerUid`, `completedAt desc`, `limit(20)`; índice definido se necessário                                                                                                                                          |
| Convites pendentes | query por `receiverUid`/`senderUid` + `status=PENDING`, `orderBy createdAt desc`, `limit(50)`; índices compostos em `firestore.indexes.json`; expirados são filtrados no cliente e varridos por `pruneExpiredTrainingInvites` |
| Grupo ativo        | leitura direta por `groupSessionId` e listeners somente em documento + participantes da sessão                                                                                                                                |
| Sets próprios      | subcoleção por participante/usuário, paginada quando histórico                                                                                                                                                                |
| Resolver parceiro  | apenas callable Function; jamais query global do navegador                                                                                                                                                                    |

Cada nova coleção exige, antes de ser criada: proprietário, campos privados/públicos, comandos permitidos, consultas, índices, retenção e Rules correspondentes.
