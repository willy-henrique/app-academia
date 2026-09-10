# Workout Engine

## Responsabilidade

O engine é determinístico e puro. Ele gera e valida um `WorkoutPlan` a partir de perfil fitness, objetivo, experiência, disponibilidade, equipamento, acessibilidade, capacidades funcionais, restrições de movimento, preferências, histórico, recovery e duração disponível. LLM não cria ficha livremente.

## Pipeline

1. Validar inputs e aplicar Safety/Compatibility Engine.
2. Selecionar blocos por objetivo, experiência, equipamento e preferências.
3. Para cada exercício, avaliar compatibilidade e escolher regressão, progressão, alternativa ou adaptação sem expor reason codes privados.
4. Estimar duração com aquecimento, séries, duração média, descanso, troca, carga, cardio, supersets e participantes.
5. Se exceder o orçamento, preservar movimentos prioritários, reduzir acessórios e mover cardio opcional; nunca remover itens aleatoriamente.
6. Produzir plano versionado e auditável; sugestões de progressão exigem confirmação do usuário.

## Duração

`WorkoutDurationEstimator` calcula solo e grupo. Em grupo, tempo de execução do colega conta como recuperação; a duração não é multiplicada simplesmente pelo número de pessoas. A feature “terminar até” apresenta alternativas antes de aplicar mudanças.

## Cardio e progressão

Cardio é `OPTIONAL`, `RECOMMENDED` ou `PROGRAM_REQUIRED`. Pular opcional não impede concluir força e deve registrar estado separado. `ProgressionEngine` observa faixa de repetições, carga, RIR e histórico; pode sugerir aumento, mas nunca modificar carga automaticamente. Volume, PR, IMC e aderência são calculados em código. IMC é triagem, não diagnóstico nem critério isolado de treino.

## Contratos principais

```text
evaluateExerciseCompatibility(input) -> { status, reasonCodes, operationalAdaptation? }
estimateWorkoutDuration(input) -> { totalSeconds, breakdown, assumptions }
generateWorkoutPlan(input) -> WorkoutPlan
validateWorkoutPlan(plan) -> ValidationResult
suggestProgression(history, prescription) -> Suggestion
```

`WorkoutPlan` é imutável após publicação em `workoutPlans/{planId}/versions/{versionId}`. Uma sessão sempre referencia a versão efetivamente executada.

## Sessão solo

`WorkoutSession` persiste a fila de exercícios, progresso, descanso e estado de cardio em `workoutSessions/{sessionId}`. O usuário retoma apenas a própria sessão por meio de `privateProfiles/{uid}.activeWorkoutSessionId`; este ponteiro não expõe dados a parceiros.

Após uma série, a fonte de verdade do descanso é `restStartedAt`, `restTargetSeconds` e `restExpectedEndAt`. A interface deriva a contagem desses timestamps, portanto o tempo continua correto depois de background, refresh ou reconexão. Ajustar ou pular descanso também atualiza os timestamps, em vez de depender de um contador JavaScript.

Ao terminar a força, a sessão fica aguardando uma decisão explícita sobre cardio opcional. `optionalCardioStatus=SKIPPED` finaliza a musculação normalmente; `COMPLETED` é registrado em separado. A sessão concluída mantém resumo, sets e `recoveryFeedback` privado, com linguagem observacional e sem diagnóstico.

## Catálogo de exercícios

O catálogo curado usa um schema explícito para evitar conteúdo solto ou sem proveniência:

- `id`, `slug`, `name`, `aliases`
- `description`, `setup`, `execution`, `breathing`, `mistakes`, `safetyNotes`
- `primaryMuscles`, `secondaryMuscles`
- `movementPattern`, `equipment`, `experienceLevel`
- `estimatedSetDuration`, `defaultRestMin`, `defaultRestMax`
- `video`, `thumbnail`, `captions`, `accessibleDescription`
- `regressions`, `progressions`, `alternatives`, `adaptations`
- `source`, `license`, `attribution`

O objetivo é que o domínio tenha conteúdo acessível, versionável e com autorização editorial clara antes de ser consumido pela engine de treino ou pela UI.

## Seed e provider

O conteúdo inicial é carregado por um provider substituível:

- `ExerciseProvider` define a porta de leitura (`list`, `getById`, `getBySlug`).
- `StaticExerciseProvider` serve o seed curado sem acoplar o domínio ao Firebase.
- O seed contém exercícios válidos contra o schema e pode alimentar a UI local, testes e tooling administrativo.

Quando a origem mudar para Firestore/Content CMS, a interface permanece a mesma e apenas o adaptador de infraestrutura troca.

## Testes

Unit tests cobrem compatibilidade, restrições, estimativas de 15/20/30/45 min, cardio opcional, progressão, versionamento e `GroupRestEngine` (incluindo três pessoas, série de 40 s, transição de 15 s e descanso de 90 s). Integração valida a forma completa persistida de sessão solo e sua autorização; E2E valida a experiência mínima de registrar série e concluir.
