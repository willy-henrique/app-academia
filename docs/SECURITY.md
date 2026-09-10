# Segurança e plano de Security Rules

## Postura

WillTreino aplica _deny by default_, privilégio mínimo, validação em profundidade e privacy by design. Autenticação não equivale a autorização. Nenhuma regra ampla como `allow read, write: if true` ou `if request.auth != null` será usada.

## Limites de confiança

| Limite                           | Controles obrigatórios                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| Browser → Firebase               | Auth, Rules por recurso, schemas client e App Check quando habilitado |
| Browser → Function/Route Handler | ID token, App Check, Zod, autorização, rate limit, resposta mínima    |
| Function → Firestore/Storage     | Admin SDK em servidor, transações, idempotência, logs protegidos      |
| Admin → dados sensíveis          | custom claims, justificativa/auditoria e acesso mínimo por função     |
| Provider externo                 | adapter, segredo servidor, timeout, schema de resposta e fallback     |

## Plano de Firestore Rules

1. Começar com nenhuma correspondência permissiva global e helpers de `signedIn()`, `isOwner(uid)`, `isSessionParticipant(id)` e validação de campos.
2. Perfis públicos: leitura somente dos campos públicos e escrita do dono limitada; `publicUserId` não é client-writable.
3. Perfis privados, fitness, health, accessibility, nutrition e settings: apenas dono; exceções administrativas não concedem leitura clínica indiscriminada.
4. Plano e sessão: dono acessa os próprios documentos; catálogo é leitura pública/autenticada conforme decisão de produto e escrita de conteúdo por servidor/admin controlado.
5. Grupo: `groupSession` e participantes nascem somente por Function ao aceitar convite. No lobby, participantes leem snapshots públicos mínimos, alteram apenas o próprio `READY`; host configura somente logística enquanto a sessão está em `LOBBY`. Host não ganha acesso aos dados sensíveis do membro.
6. Convites: apenas sender/receiver lê `trainingInvites`; criação, aceite, recusa, expiração e cancelamento passam por `sendTrainingInvite`/`respondToTrainingInvite`/`pruneExpiredTrainingInvites` para garantir transições, bloqueios e limites. `blockedUsers/{owner}/blocked/*` é gerenciado só pelo dono; `notifications/{uid}/items/*` é criado por Function e o dono apenas lê e alterna `readAt`.
7. `weeklyStats`, `publicUserIdIndex`, `adminRoles`, `auditLogs`, `subscriptionState`, `processedEvents` e flags operacionais: sem escrita client.
8. Storage: avatar com escopo do dono; progresso e conteúdo privado sem leitura de terceiros; validações de caminho, MIME, tamanho e metadados.

## Functions privilegiadas

Toda Function privilegiada valida autenticação, App Check aplicável, schema, autorização e estado atual antes de executar. Entradas iniciais: `resolvePublicUserId`, geração de WillTreino ID, `sendTrainingInvite`/`respondToTrainingInvite`/`pruneExpiredTrainingInvites`, início de grupo, finalização/idempotência de métricas, linking sensível, ações administrativas e exclusão de conta. `respondToTrainingInvite` é transacional e idempotente: aceitar cria uma única `groupSession` e retentativas retornam o `groupSessionId` existente.

`startGroupSession()` deve ser transacional e idempotente: valida host, participantes e estado; grava uma única vez `status=COUNTDOWN` e `startAt=serverTime+contagem`; retentativas retornam o estado existente. Nenhum client pode escrever `startAt`.

## Proteções complementares

- Firebase App Check: configuração de debug permitida somente em desenvolvimento; enforcement progressivo e monitorado em produção.
- Rate limits: resolver ID público, convites, IA, uploads, barcode, fluxos de senha e pagamentos. `resolvePublicUserId` aplica limite por usuário autenticado com bucket server-side; convites repetidos, bloqueios e abuso são verificados no servidor.
- Auth: email/senha, Google, verificação e recuperação oficiais; account linking com reautenticação quando necessário; sem JWT inventado ou tokens copiados para localStorage.
- Roles: claims/custom mechanism controlado pelo servidor; client nunca escolhe a própria role. MFA preparada para admins e reautenticação para ações críticas.
- Headers: CSP compatível com Firebase, HSTS apenas em produção HTTPS, Referrer-Policy, X-Content-Type-Options, Permissions-Policy e frame policy.
- LGPD: minimização, consentimento, exportação, correção, exclusão, retenção e logs sem conteúdo sensível.

## Testes de segurança obrigatórios

Firebase Emulator deve provar que A não lê dados privados/saúde/acessibilidade/nutrição de B, não altera sets de B, não altera estatísticas/roles e que C não lê sessão de grupo alheia. Também deve validar start autoritativo, índice público inacessível, Storage de fotos privadas e transições de convite. A matriz de autorização é [SECURITY_MATRIX.md](SECURITY_MATRIX.md).

## Revisão de hardening (Fase 24 — 2026-09-09)

### Ameaças e controles em vigor

| Ameaça                                          | Controle implementado                                                                        | Evidência                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| Ler dados privados/saúde de parceiro de treino  | Rules por caminho e campo; snapshot público sem dado sensível                                | Emulator (privacidade de grupo)  |
| Escrever série ou conclusão em nome de terceiro | `request.auth.uid` obrigatório no caminho; eventos imutáveis; conclusão só por callable      | Emulator (grupo, conclusão)      |
| Inflar estatísticas                             | `weeklyStats` server-writable only + ledger `processedEvents` server-only                    | Emulator (stats, deny default)   |
| Reprocessar/duplicar evento                     | Id determinístico + ledger na mesma transação                                                | Emulator (retry não soma)        |
| Abuso de endpoint caro                          | Rate limit por usuário em `resolvePublicUserId`, `sendTrainingInvite` e `rebuildWeeklyStats` | `functions/rate-limit.js`        |
| Coleção nova exposta por engano                 | Catch-all `deny` + teste de regressão sobre coleções sem regra                               | Emulator (deny by default)       |
| XSS / injeção de script                         | CSP sem `unsafe-eval` em produção, `object-src 'none'`, `frame-ancestors 'none'`             | `src/config/security-headers.ts` |
| Clickjacking                                    | `X-Frame-Options: DENY` + `frame-ancestors 'none'`                                           | idem                             |
| Upload malicioso                                | Storage aceita só imagem até 10 MB no caminho do dono; cliente valida MIME antes de enviar   | Storage Emulator                 |
| Vazamento por cache do navegador                | Service worker nunca cacheia Firebase nem `/api/`                                            | `public/sw.js`                   |

### Auditoria de dependências (2026-09-09)

`npm audit` reporta **16 vulnerabilidades moderadas, nenhuma alta ou crítica**, todas transitivas de `firebase-admin`, `firebase-functions` e `firebase-tools` (`@opentelemetry/core`, `csv-parse`, `qs`, `re2`, `stream-json`, `uuid`). Nenhuma delas entra no bundle do navegador: são dependências de servidor e de ferramenta. Decisão: **não** rodar `npm audit fix --force` agora, porque ele rebaixaria/subiria major do Firebase fora de teste; a correção entra junto da próxima atualização planejada do Firebase, com a suíte de emulador como gate.

### Itens que dependem do console do Firebase/GCP

- **IAM (24.3)**: revisar contas de serviço com privilégio mínimo (Functions com acesso apenas a Firestore/Auth/Storage do projeto; nenhum papel `Editor` para humanos).
- **App Check (24.4)**: o código já respeita `FUNCTIONS_ENFORCE_APP_CHECK` e recusa chamada sem App Check quando ligado. Falta ativar o enforcement gradual no console e acompanhar as métricas antes de exigir 100%.

Ambos estão registrados em [OPERATIONS.md](OPERATIONS.md) e permanecem pendentes de execução por quem tem acesso ao projeto.
