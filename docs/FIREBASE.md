# Firebase

## Serviços e uso

| Serviço         | Papel                                                               |
| --------------- | ------------------------------------------------------------------- |
| Authentication  | identidade, Google, email/senha, verificação, recuperação e linking |
| Firestore       | dados operacionais, planos versionados, sessões e projeções         |
| Storage         | avatares, mídia curada e conteúdo privado com regras por caminho    |
| Functions Gen 2 | comandos privilegiados, índices, métricas, notificações e jobs      |
| Cloud Messaging | convites, lobby e lembretes sem dados sensíveis na lockscreen       |
| App Check       | redução de abuso em app/browser; debug autorizado só no dev         |
| Remote Config   | feature flags e rollout gradual                                     |
| Analytics       | eventos não sensíveis, com taxonomia e consentimento aplicável      |
| Emulator Suite  | Auth, Firestore, Functions, Storage e testes de Rules locais        |

## Separação de SDKs

- Firebase Web SDK é usado apenas em Client Components/hooks/adapters cliente.
- Firebase Admin SDK fica em Functions/Route Handlers marcados `server-only`; não entra em `src/app` cliente ou bundle.
- Tokens Firebase são verificados no servidor para APIs protegidas; não há JWT próprio.

## Adapter cliente atual

`src/infrastructure/firebase/client.ts` usa a API modular do Firebase e inicializa Auth, Firestore e Storage somente no browser. Ele exige explicitamente as variáveis públicas `NEXT_PUBLIC_FIREBASE_*`, falha cedo quando a configuração está incompleta e não contém valores de projeto. A Task 1.6 documentará essas variáveis em `.env.example`; Admin SDK, App Check, emuladores e providers ainda pertencem às tasks subsequentes.

## Adapter Admin atual

`src/infrastructure/firebase/admin.ts` importa `server-only` e usa `firebase-admin` somente em ambiente de servidor. Ele requer `FIREBASE_PROJECT_ID` e aceita credenciais padrão do ambiente (produção/Functions) ou `FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY` fornecidos por secret manager. Arquivos de conta de serviço não são suportados nem devem ser versionados.

## Ambientes

`development`, `test` (emulators), `staging` e `production` terão projetos/configurações separados. A futura `.env.example` nomeará variáveis sem valores secretos. Segredos ficam em Secret Manager/configuração de deploy. A Task 1.5 impede que testes usem acidentalmente produção.

`.env.example` agora documenta os identificadores públicos do Firebase e as variáveis exclusivamente server-side do Admin SDK. Ele contém somente chaves vazias; service accounts devem entrar por Secret Manager ou Application Default Credentials.

### Contrato de ambientes

`development`, `test`, `staging` e `production` devem usar projetos Firebase distintos. `NEXT_PUBLIC_APP_ENV` seleciona o ambiente e `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` é obrigatório em `test`, permitido somente em `development` e proibido em `staging`/`production`. `src/config/environment.ts` valida esse contrato antes de qualquer integração que o consuma. Cada ambiente recebe seu próprio `.env.*.local` (ignorado pelo Git), Secret Manager e configuração de deploy; nenhum ID de projeto real é versionado.

## Emuladores e CI

O comando de teste futuro deve iniciar emuladores isolados, carregar regras e executar testes de integração/RULES. CI executará lint, typecheck, unit, integration/rules e build; Playwright roda em job apropriado. Falha de emulador não pode ser mascarada com `--force` ou rules abertas.

### Configuração local atual

`firebase.json` configura Auth, Firestore, Functions Gen 2, Storage e Emulator UI para o projeto local `willtreino-local`. As regras iniciais de Firestore e Storage negam toda leitura/escrita; o primeiro teste de integração comprova essa negação. Execute `npm run test:emulator` com um JDK 21+ disponível no `PATH`. O comando usa `emulators:exec`, portanto não pode acessar um projeto Firebase remoto.

Para autenticação local no projeto Firebase remoto, o console precisa ter **Email/Password** e **Google** habilitados em Authentication → Sign-in method. Projetos criados após abril de 2025 não incluem `localhost` nos domínios autorizados automaticamente: adicione `localhost` em Authentication → Settings → Authorized domains para testar OAuth local. A CSP do app permite apenas os hosts oficiais necessários ao helper do Google (`apis.google.com`, `www.gstatic.com` e `accounts.google.com`), sem liberar scripts genéricos.

### Modo local de desenvolvimento

Quando o console Firebase ainda não está pronto, o Web App pode operar em modo
local apenas para validar os fluxos visuais e de navegação. Em `.env.local`:

```dotenv
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_AUTH_MODE=local
```

Esse modo cria somente uma sessão efêmera no navegador: não envia senha,
token ou dados ao Firebase e não libera recursos de produção como WillTreino
ID, convite, treino em grupo ou sincronização. Ele mostra um aviso explícito
na aplicação e é bloqueado fora de `development`. Para voltar à autenticação
real, habilite os provedores no console, autorize `localhost`, altere
`NEXT_PUBLIC_AUTH_MODE=firebase` e reinicie o servidor.

## CI

`.github/workflows/ci.yml` executa em PRs e pushes para `main` usando Node 22 e Java 21. Ele instala dependências com `npm ci` e exige `format:check`, lint, typecheck, testes unitários, Rules Emulator e build antes de aceitar uma alteração. A pipeline não recebe credenciais Firebase nem toca em um projeto remoto.

## Índices, custos e realtime

Índices compostos surgem dos access patterns documentados, não por tentativa e erro em produção. Listeners se limitam à sessão ativa, participantes e eventos necessários. Timers derivam de timestamps, logo não produzem writes a cada segundo. Snapshots públicos mínimos e projeções semanais evitam N+1.
