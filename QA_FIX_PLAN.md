# Plano de Correção — WillTreino

Este plano organiza os defeitos e pontos de melhoria identificados na auditoria de QA em uma fila ordenada de implementação técnica. Foi estruturado para permitir que outro desenvolvedor ou IA execute as correções de ponta a ponta sem necessidade de re-investigação.

---

## FASE 1 — Problemas Críticos (Bloqueadores de Fluxo)

### Item 1: Provisionamento Just-in-Time (JIT) do Perfil Público (BUG-001)
- **Problema:** Usuários recém-registrados não possuem documento na coleção `publicProfiles/{uid}`, resultando em HTTP 404 em `/api/me/public-profile` e impedindo a exibição do WillTreino ID e o fluxo de convites sociais.
- **Provável Origem:** Dependência exclusiva do trigger Cloud Function `auth.user().onCreate`, que não roda em tempo real no ambiente Next.js na Vercel.
- **Arquivos Afetados:**
  - `src/app/api/me/public-profile/route.ts`
  - `src/features/profile/public-profile-card.tsx`
- **Estratégia de Correção:**
  1. Em `src/app/api/me/public-profile/route.ts`, quando `snapshot.exists` for falso, criar o registro imediatamente:
     - Gerar um `publicUserId` com a função `generatePublicUserId()` de `src/domain/identity/public-user-id.ts`.
     - Gravar em transação ou batch: `publicUserIdIndex/{normalizedId}` e `publicProfiles/{uid}` com `displayName`, `avatar` e `badgesPublic: []`.
  2. Responder com status HTTP 200 contendo o novo perfil.
- **Risco de Regressão:** Baixo.
- **Testes Necessários:** `src/app/api/me/public-profile/route.test.ts` (atualizar teste para validar criação automática quando o perfil não existe).

---

### Item 2: Correção de Índice e Consulta de Histórico Recente na Evolução (BUG-002)
- **Problema:** A página `/progress` falha com *"Não conseguimos carregar sua evolução"* ao consultar `listRecentExerciseResults`.
- **Provável Origem:** Em `src/features/progression/history-repository.ts`, a query usa `orderBy("completedAt", "desc")`, mas o Firestore exige um índice composto correspondente. O arquivo `firestore.indexes.json` possui apenas `completedAt` com ordenação `ASCENDING`.
- **Arquivos Afetados:**
  - `firestore.indexes.json`
  - `src/features/progression/history-repository.ts`
- **Estratégia de Correção:**
  1. Adicionar o índice composto com `completedAt: "DESCENDING"` em `firestore.indexes.json`:
     ```json
     {
       "collectionGroup": "workoutSessions",
       "queryScope": "COLLECTION",
       "fields": [
         { "fieldPath": "ownerUid", "order": "ASCENDING" },
         { "fieldPath": "status", "order": "ASCENDING" },
         { "fieldPath": "completedAt", "order": "DESCENDING" }
       ]
     }
     ```
  2. Em `history-repository.ts`, caso a query do Firestore falhe por falta de índice ou em modo offline, retornar fallback gracioso (array vazio) em vez de estourar erro não tratado na UI.
- **Risco de Regressão:** Baixo.
- **Testes Necessários:** `src/features/progression/progress-charts.test.tsx`.

---

## FASE 2 — Funcionalidades e Validações

### Item 3: Validação Estrita de Dados de Saúde no Wizard de Onboarding (BUG-003)
- **Problema:** Campos de altura e peso aceitam valores negativos (ex: `-10`) no cliente, provocando inconsistência com as regras de segurança do Firestore (`weightKg > 0 && weightKg <= 400`).
- **Provável Origem:** Falta de resolução de erros via schema Zod no `useForm` em `src/features/onboarding/onboarding-wizard.tsx`.
- **Arquivos Afetados:**
  - `src/features/onboarding/onboarding-wizard.tsx`
  - `src/domain/onboarding/onboarding.ts`
- **Estratégia de Correção:**
  1. No step `physical_profile` do wizard, adicionar validação antes do avanço de etapa:
     - Bloquear valores menores que 50 cm ou maiores que 250 cm para altura.
     - Bloquear valores menores que 20 kg ou maiores que 400 kg para peso.
  2. Exibir mensagem de erro inline no componente `<Input>` caso o usuário informe um número fora da faixa fisiológica.
- **Risco de Regressão:** Baixo.
- **Testes Necessários:** `src/features/onboarding/onboarding-wizard.test.tsx`.

---

### Item 4: Tratamento Amigável de Erros no Cadastro de Usuário (BUG-004)
- **Problema:** O cadastro pode falhar com mensagens opacas quando o email já existe no Firebase Auth ou a conexão falha.
- **Arquivos Afetados:**
  - `src/features/auth/signup.ts`
  - `src/features/auth/signup-form.tsx`
- **Estratégia de Correção:**
  1. Mapear códigos específicos do Firebase Auth:
     - `auth/email-already-in-use` ➔ *"Este e-mail já está cadastrado. Faça login ou recupere sua senha."*
     - `auth/invalid-email` ➔ *"Informe um endereço de e-mail válido."*
     - `auth/weak-password` ➔ *"A senha deve ter no mínimo 6 caracteres."*
- **Risco de Regressão:** Nenhum.
- **Testes Necessários:** `src/features/auth/signup-form.test.tsx`.

---

## FASE 3 — Refinamento de UI e UX

### Item 5: Alinhamento de Botão na Busca de Alimentos (BUG-005)
- **Problema:** Margem inferior manual `sm:mb-[1.625rem]` desalinhada em viewports intermediários.
- **Arquivos Afetados:**
  - `src/features/nutrition/food-search-panel.tsx`
- **Estratégia de Correção:** Ajustar o flexbox pai com `sm:items-end` e remover a margem hardcoded do botão.

---

## Tabela de Priorização e Execução

| Ordem | Identificador | Título do Problema | Impacto no Usuário | Complexidade Estimada |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **BUG-001** | Provisionamento automático do perfil e WillTreino ID | Alto (Bloqueia identidade e social) | Média |
| **2** | **BUG-002** | Correção do índice da consulta de evolução | Alto (Tela de evolução quebrada) | Baixa |
| **3** | **BUG-003** | Validação de altura e peso no Onboarding | Médio (Evita dados corrompidos) | Baixa |
| **4** | **BUG-004** | Mensagens compreensíveis no cadastro | Médio (Melhora taxa de conversão) | Baixa |
| **5** | **BUG-005** | Alinhamento visual na busca de alimentos | Baixo (Polimento estético) | Muito Baixa |
