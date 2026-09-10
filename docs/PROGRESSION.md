# Progressão, Recordes e Medidas

## Histórico próprio

`listRecentExerciseResults(uid, sessionLimit)` lê as últimas sessões concluídas da própria pessoa (`workoutSessions` com `ownerUid` e `status == "COMPLETED"`, ordenadas por `completedAt` desc) e as séries de cada uma. A varredura é limitada por `sessionLimit` — nunca o histórico inteiro — e é sempre escopada ao chamador; as Rules já impedem ler sessão alheia. Cada série guarda `exerciseId`, de modo que histórico, recorde e progressão são calculáveis sem depender do id do documento.

## Recorde pessoal

`detectPersonalRecord` escolhe a série mais pesada do exercício; empate em carga é decidido por mais repetições e depois pela data mais antiga, então o mesmo histórico sempre produz o mesmo recorde (idempotente e verificável). `isNewPersonalRecord` responde se uma série nova realmente supera o histórico — série sem carga ou sem repetição nunca vira recorde.

## Progression Engine

`suggestProgression(lastResult, target)` é determinístico e devolve `INCREASE_LOAD`, `ADD_REP`, `HOLD` ou `REDUCE_LOAD` com carga e repetições sugeridas, sempre com `needsConfirmation: true`. **O app nunca altera a carga sozinho**: a sugestão é exibida com o motivo e depende da decisão da pessoa. O passo de carga é 2,5 kg (duas anilhas de 1,25 kg) e a sugestão respeita a faixa de repetições da prescrição e o RIR alvo.

## Volume

`computeSetVolume` = carga × repetições, arredondado a duas casas; dados incompletos (carga ou repetição zerada, valor não numérico) contribuem com zero em vez de inventar número. `computeTotalVolume` e `buildVolumeSeries` agregam por sessão, da mais antiga para a mais recente.

## Gráficos acessíveis

`/dashboard` carrega `ProgressCharts` sob demanda (`next/dynamic`), então o card semanal não espera pelo histórico. As barras são decorativas (`aria-hidden`) e os mesmos números aparecem sempre em uma tabela com `caption` e cabeçalhos — leitor de tela nunca depende do desenho. Optamos por SVG/CSS próprio em vez de Recharts: menos dependência, bundle menor e acessibilidade sob nosso controle.

## Medidas e fotos privadas

`measurements/{uid}/items/{id}` é owner-only em leitura e escrita, com forma validada nas Rules (chaves permitidas, `ownerUid`, peso e altura em faixas plausíveis). O domínio calcula IMC de forma determinística e compara apenas campos presentes nas duas medidas — sem diagnóstico, sem inventar valor ausente. Fotos de progresso vão para `progress/{uid}` no Storage: apenas imagem, apenas o dono envia, lê e apaga; o Emulator prova que outra conta não lê nem apaga.

## Testes

Unit: volume com dados incompletos, último resultado por data, recorde com critérios de desempate, detecção de novo recorde, as quatro decisões do engine com confirmação obrigatória, série de volume por sessão, IMC, faixas plausíveis e comparação de medidas. RTL: gráfico com tabela acessível, recorde, sugestão confirmável, estado vazio honesto e painel de medidas com IMC derivado e upload de foto. Emulator: `measurements` owner-only e validada; Storage nega leitura, escrita e exclusão de foto de progresso alheia.
