# Operação e Release

## Ambientes

| Ambiente        | Projeto Firebase         | Observação                                                      |
| --------------- | ------------------------ | --------------------------------------------------------------- |
| Local           | `willtreino-local`       | Emulator Suite (auth, firestore, functions, storage)            |
| Desenvolvimento | definido no `.env.local` | Sem dados reais de pessoas                                      |
| Produção        | a definir                | App Check com enforcement, HSTS, backups e alertas obrigatórios |

O toolchain roda no WSL Ubuntu: `node_modules` é symlink para o cache em `/home/willy/.cache/willtreino-deps`. `build` e `dev` usam `--webpack` porque o Turbopack não aceita esse symlink.

## Pipeline de release

1. `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run test:emulator` (exige JDK 21)
6. `npm run build`
7. `firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting`
8. `npm run smoke -- https://<url-do-deploy>`

Nenhuma etapa pode ser pulada para "corrigir depois": Rules e índices precisam subir junto do código que depende deles.

## Deploy de Rules e índices

`firestore.rules`, `firestore.indexes.json` e `storage.rules` ainda **não foram publicados** em nenhum projeto remoto — hoje são validados apenas pelo Emulator. Antes do primeiro deploy real, publique-os **antes** das Functions, para não deixar uma janela em que a Function grava em coleção sem regra.

Índices necessários hoje: convites por remetente/destinatário, `workoutSessions` por dono/status/`completedAt`, `cardioSessions` por dono/status/`completedAt` e o índice de grupo `participants` (uid + status) usado por rebuild e exportação.

## Rollback

1. Hosting: `firebase hosting:rollback` ou redeploy da release anterior (o Hosting mantém o histórico de versões).
2. Functions: redeploy da tag anterior do repositório. As callables são idempotentes, então repetir uma chamada durante o rollback não corrompe estatística.
3. Rules: mantenha a versão anterior versionada no Git e publique com `firebase deploy --only firestore:rules`. Nunca faça rollback de código deixando Rules novas no ar — o inverso (Rules mais restritivas com código antigo) é o lado seguro.
4. Dados: mudanças de projeção (`weeklyStats`) são reconstruíveis com `rebuildWeeklyStats`, então rollback de código não exige rollback de dados.

## Backup e retenção

- Exportação programada do Firestore para um bucket do Cloud Storage: `gcloud firestore export gs://<bucket>-backups/$(date +%F)`, agendada diariamente.
- Retenção sugerida: 30 dias de backups diários e 12 meses de backups mensais.
- Restauração: `gcloud firestore import gs://<bucket>-backups/<data>` em um projeto de teste primeiro. Um _restore drill_ deve ser feito antes do lançamento e repetido a cada trimestre.
- Storage (fotos de progresso): versionamento de objeto ativado no bucket.
- Backup nunca é exportado para máquina pessoal: dado de saúde permanece na infraestrutura do projeto.

## Monitoramento e alertas

Configurar no console (pendente de acesso ao projeto):

- Alerta de taxa de erro por Function (`recordWorkoutCompletion`, `completeGroupParticipation`, `startGroupSession`, `deleteAccountData`).
- Alerta de latência p95 acima de 3 s nas callables.
- Alerta de `resource-exhausted` acima do normal, que indica abuso ou limite mal calibrado.
- Erros de cliente sem PII: nenhuma mensagem de log deve conter e-mail, UID de terceiro, carga, medida ou dado de saúde.
- Painel de uso de App Check para acompanhar o enforcement gradual.

## IAM (pendente de acesso ao projeto)

- Nenhum humano com papel `Owner`/`Editor` no projeto de produção; usar papéis específicos (`Firebase Admin`, `Cloud Functions Developer`) por pessoa.
- Conta de serviço das Functions restrita a Firestore, Auth e Storage do próprio projeto.
- Chaves de serviço não são baixadas para máquinas locais; deploy usa credencial de CI de curta duração.

## App Check (pendente de ativação)

O código já recusa chamadas sem App Check quando `FUNCTIONS_ENFORCE_APP_CHECK=true`. Rollout sugerido: (1) ativar em modo de monitoramento, (2) acompanhar por uma semana o volume de chamadas sem token, (3) ligar o enforcement por callable começando pelas mais sensíveis (`sendTrainingInvite`, `deleteAccountData`), (4) ligar para todas. Nunca desabilitar em produção para "resolver" um erro de cliente.

## Exclusão de conta e LGPD

`exportAccountData` e `deleteAccountData` são as rotas oficiais de acesso e eliminação. A exclusão apaga sessões, séries, cardios, medidas, projeções, notificações, bloqueios e perfis da pessoa, anonimiza a participação dela em treinos de grupo (preservando o histórico de quem treinou junto) e remove a conta de autenticação. Pedidos por outros canais devem ser redirecionados para essa função, nunca atendidos por edição manual no console.
