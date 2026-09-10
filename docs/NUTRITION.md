# Nutrition Domain

## Limites do produto

WillFood organiza alimentos, registros, receitas, orçamento e lista de compras. Não diagnostica, não prescreve dieta e não se apresenta como nutricionista. Macros e calorias têm natureza aproximada e sempre mantêm a proveniência do dado.

## Food domain

`src/domain/nutrition/food.ts` estabelece o contrato inicial:

- `Food` possui nome, aliases, marca/código de barras opcionais e porção padrão.
- `nutritionPer100g` usa quilocalorias, gramas de carboidratos/proteínas/gorduras/fibras e miligramas de sódio. Valores ausentes de fibra e sódio permanecem `null`, nunca zero inventado.
- `FoodServing` registra unidade legível e massa em gramas quando conhecida. Uma unidade sem massa não é convertida em macro por suposição.
- `FoodSource` exige atribuição, provider, confiança e, quando houver, licença, URL, id externo e data de coleta.
- `estimateFoodNutrition()` é cálculo determinístico a partir de 100 g, arredondado a uma casa decimal apenas para apresentação/planejamento.

O domínio de preço é separado e será adicionado na Task 17.7. Todo dinheiro continuará inteiro em centavos.

## Providers e privacidade

`FoodProvider`, em `src/application/nutrition/food-provider.ts`, é a porta de consulta do catálogo. Ele normaliza buscas em português sem acento, limita resultados entre 1 e 50 e não expõe detalhes específicos de infraestrutura à interface.

`InternalFoodProvider` é o fallback funcional inicial: um catálogo local e deliberadamente pequeno para manter a experiência utilizável sem credenciais ou chamadas externas. Todos os itens carregam `provider: INTERNAL` e confiança `ESTIMATED`; ele não deve ser apresentado como uma base nutricional completa ou em tempo real.

Qualquer integração externa futura entra por um adapter próprio, com atribuição/licença preservadas, feature flag, limites de uso e revisão de privacidade. Diário, preferências alimentares, receitas privadas e orçamento pertencem somente ao dono; parceiro de treino não recebe esses dados.

## Busca no produto

`/food` apresenta uma busca deliberada (não uma lista infinita). Cada resultado informa porção, energia e macros aproximados, além de provider e confiança. A tela usa o catálogo interno nesta etapa; se não conhece a massa de uma porção, não calcula macros por suposição. Ela também deixa explícito que não há preços em tempo real nem aconselhamento nutricional individual.

## Diário alimentar privado

O contrato `FoodLogEntry` registra uma fotografia do alimento no instante do consumo: provider, confiança, nome, porção, gramas e macros calculados. Isso evita que uma mudança posterior no catálogo altere o histórico da pessoa.

Os documentos vivem em `foodLogs/{uid}/entries/{entryId}`. As Firestore Rules permitem somente ao dono criar, listar, ler, atualizar e excluir as próprias entradas, validam o formato do snapshot e rejeitam provider ou macros fora do contrato. A validação no Emulator está pendente no ambiente atual porque o Firebase Emulator exige Java; ela deve rodar antes de liberar a feature em produção.
