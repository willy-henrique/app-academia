# QA Implementation Status

Este arquivo rastreia a execução controlada das correções baseadas na auditoria de QA e no bug crítico de Cardio.

---

## CANONICAL BUG LIST

| Canonical ID | Descrição | Prioridade | Arquivos Principais | Dependências | Status |
|---|---|---|---|---|---|
| **FIX-001 (BUG-001)** | Provisionamento JIT de Perfil Público e WillTreino ID | P0 | `src/app/api/me/public-profile/route.ts` | Nenhuma | Em andamento |
| **FIX-002 (BUG-002)** | Falha no histórico de evolução `/progress` (índice e query) | P1 | `src/features/progression/history-repository.ts`, `firestore.indexes.json` | Nenhuma | Pendente |
| **FIX-003 (CARDIO-REFRESH)** | Sessão de cardio pendente órfã após refresh na página `/cardio` | P1 | `src/features/cardio/cardio-page-client.tsx`, `src/features/cardio/cardio-repository.ts` | Nenhuma | Pendente |
| **FIX-004 (BUG-003)** | Validação de altura e peso no Onboarding (valores inválidos/negativos) | P2 | `src/features/onboarding/onboarding-wizard.tsx` | Nenhuma | Pendente |
| **FIX-005 (BUG-004)** | Mensagens amigáveis de erro no cadastro com Firebase Auth | P2 | `src/features/auth/signup.ts`, `src/features/auth/signup-form.tsx` | Nenhuma | Pendente |
| **FIX-006 (BUG-005)** | Alinhamento visual do botão de busca de alimentos em `/food` | P3 | `src/features/nutrition/food-search-panel.tsx` | Nenhuma | Pendente |
| **FIX-007 (LINT-CLEANUP)**| Limpeza de imports e variáveis não utilizadas | P3 | Arquivos diversos | Nenhuma | Pendente |

---

## DETALHAMENTO POR BUG

### FIX-001 (BUG-001) — Provisionamento JIT do Perfil Público
Status:
- [x] Investigado
- [x] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada

---

### FIX-002 (BUG-002) — Falha na Evolução e Consulta de Histórico Recente
Status:
- [ ] Investigado
- [ ] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada

---

### FIX-003 (CARDIO-REFRESH) — Sessão de Cardio Ativa Após Refresh
Status:
- [ ] Investigado
- [ ] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada

---

### FIX-004 (BUG-003) — Validação de Altura e Peso no Onboarding
Status:
- [ ] Investigado
- [ ] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada

---

### FIX-005 (BUG-004) — Mensagens Amigáveis no Cadastro
Status:
- [ ] Investigado
- [ ] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada

---

### FIX-006 (BUG-005) — Alinhamento no Painel de Busca de Alimentos
Status:
- [ ] Investigado
- [ ] Causa confirmada
- [ ] Correção implementada
- [ ] Teste criado/atualizado
- [ ] Teste direcionado aprovado
- [ ] Regressão aprovada
