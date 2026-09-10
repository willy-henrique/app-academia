# Arquitetura

## Estilo

WillTreino será um **modular monolith** em Next.js App Router. O deploy pode conter frontend Next.js e Cloud Functions Gen 2, mas os limites de domínio e aplicação serão mantidos no mesmo código-base e contratos explícitos. Microserviços não são premissa.

```text
Browser/PWA
  ├─ React (views, componentes, hooks e estado de apresentação)
  ├─ Firebase client SDK (Auth, Firestore, Storage, Messaging)
  └─ cache/offline queue local
          │ regras e contratos
Next.js server / Cloud Functions Gen 2
  ├─ autenticação, App Check, rate limit e autorização
  ├─ casos de uso privilegiados e transações idempotentes
  └─ Admin SDK
          │
Firebase: Auth · Firestore · Storage · FCM · Remote Config · Emulator Suite
```

## Estrutura-alvo

```text
src/
  app/                 # rotas App Router, layouts e Route Handlers finos
  components/          # componentes compartilhados de apresentação
  features/            # composição de UI por funcionalidade
  domain/              # entidades, value objects, engines e regras puras
    auth/ identity/ profile/ accessibility/ workout/ group-training/
    progression/ cardio/ recovery/ nutrition/ budget/ gamification/ ai/
  application/         # casos de uso e portas (interfaces)
  infrastructure/      # adaptadores Firebase, providers e observabilidade
    firebase/ providers/
  lib/ hooks/ schemas/ config/ types/
functions/             # Cloud Functions Gen 2, entradas pequenas e casos de uso
tests/                 # unit, integration/rules e e2e
```

## Regras de dependência

- `domain` não importa React, Firebase SDK, Admin SDK ou browser APIs.
- `application` coordena domínio por interfaces; não conhece widgets.
- `infrastructure` implementa as interfaces de `application`.
- `features`/`components` podem chamar hooks e casos de uso, mas não conter cálculo complexo de domínio.
- `app` apenas compõe rota, proteção, metadata e streaming; uma página não deve tornar-se uma engine.
- Código `server-only` fica segregado e nunca é importado por Client Components.

## Módulos e responsabilidades

| Módulo           | Responsabilidade inicial                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- |
| identity/profile | perfil público/privado, WillTreino ID, preferências e consentimentos                     |
| accessibility    | capacidades funcionais, adaptações e preferências de interface privadas                  |
| workout          | catálogo, compatibilidade, geração/versionamento de planos, sessão solo e duração        |
| group-training   | convite, lobby, presença não crítica, fila, início autoritativo e descanso compartilhado |
| progression      | histórico, PRs, recomendação confirmável e métricas derivadas                            |
| cardio/recovery  | cardio separado da conclusão de força e check-ins não diagnósticos                       |
| nutrition/budget | alimentos, preços com proveniência, refeições e valores inteiros em centavos             |
| ai               | provider abstraído, ferramentas com escopo mínimo e camada de segurança                  |

## Fluxos autoritativos

1. Client cria comandos validados; nunca recebe privilégios implícitos por ser autenticado.
2. Escritas simples do próprio usuário podem ser permitidas por Rules restritas e schemas de cliente.
3. Operações sensíveis — resolver ID público, convites, início/fim de grupo, índices, aggregates, roles, auditoria e exclusão de conta — passam por Function/servidor com Admin SDK.
4. O servidor grava timestamps, controla transições e usa transação/ledger para idempotência.
5. UI observa somente documentos específicos; timers são derivados de timestamps, nunca sincronizados a cada segundo.

## Configuração e flags

- Configuração pública Firebase usa somente variáveis `NEXT_PUBLIC_*` que sejam realmente públicas.
- Credenciais Admin, Sentry e providers ficam em Secret Manager/ambiente de servidor, nunca no bundle.
- Remote Config/feature flags controlam lançamentos: `group_training_enabled`, `parallel_workouts_enabled`, `nutrition_enabled`, `ai_coach_enabled`, `pose_analysis_enabled`, `payments_enabled`, `social_enabled`, `strava_enabled`.
- A ausência de credencial usa provider indisponível com UX clara; não bloqueia a base do produto.

## Observabilidade

Operações críticas produzem logs estruturados com `requestId`, `eventType`, resultado, duração e identificadores internos protegidos. Nunca incluem senha, token, dado médico integral ou conteúdo privado de nutrição. A integração de error tracking entra por adapter para permitir Sentry ou equivalente.
