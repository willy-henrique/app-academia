# WillTreino — Master Plan

## Objetivo

WillTreino será um produto mobile-first para planejamento e execução de treinos solo e em grupo, com privacidade por padrão, acessibilidade, nutrição consciente de orçamento e assistência por IA baseada em dados e regras determinísticas. Não é um protótipo: cada entrega deve ser segura, testada, observável e preparada para evolução comercial.

## Estado inicial auditado

- Diretório do projeto: `C:\willydev\appACADEMIA` (`/mnt/c/willydev/appACADEMIA` no ambiente atual).
- Situação em 2026-09-02: diretório vazio, sem `.git`, código-fonte, `package.json`, Firebase ou suíte de testes.
- Consequência: a Fase 0 documenta a fundação. A criação do app e do repositório só será avaliada na Task 1.1; nada foi recriado ou removido nesta fase.

## Princípios inegociáveis

1. Entregar uma task por vez; não antecipar telas ou recursos de fases futuras.
2. Inspecionar o estado atual e `git status` antes de cada alteração. Quando Git ainda não existir, registrar esse fato.
3. Modular monolith: domínio e casos de uso independentes de React/Firebase sempre que possível.
4. Firebase Authentication é a identidade; UID é interno e nunca uma identificação pública de UX.
5. Dados de saúde, acessibilidade, nutrição, medidas e progresso são privados por padrão.
6. Firestore e Storage usam _deny by default_; aggregates, índices, auditoria, roles e eventos processados são server-writable only.
7. Cálculos críticos (tempo, descanso, volume, custo, adesão, progressão e IMC) são determinísticos. IA explica e orquestra ferramentas com dados mínimos.
8. O treino em grupo é uma sessão compartilhada autoritativa, mas cargas, séries e conclusão são individuais.
9. Mobile, WCAG 2.2 AA, estados offline e observabilidade pertencem a cada módulo, não a uma etapa de acabamento.
10. `DONE` exige os testes e verificações definidos na task executados com sucesso; credenciais externas ausentes resultam em adaptadores, flags e fallback — não em chaves inventadas.

## Ciclo obrigatório de task

1. Ler o código, configurações, documentação e estado do Git.
2. Delimitar a menor implementação correta e as regras de segurança/acessibilidade aplicáveis.
3. Implementar somente esse escopo.
4. Criar ou atualizar testes unitários, integração, Rules Emulator e/ou E2E relevantes.
5. Executar `lint`, `typecheck`, testes relevantes e `build`.
6. Corrigir todo erro introduzido.
7. Atualizar os documentos afetados.
8. Atualizar `IMPLEMENTATION_STATUS.md` com evidência. Só então iniciar a próxima task.

Se o repositório ainda não oferecer um script aplicável, a task deve explicar o motivo em `Observações`, manter-se `BLOCKED` quando o pré-requisito for indispensável e nunca alegar que uma verificação inexistente foi executada.

## Roadmap técnico e gates

| Fase                                        | Resultado de saída                                          | Gate                                               |
| ------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| 0. Auditoria                                | Documentos, modelo, matriz e ADRs coerentes                 | Revisão de documentação                            |
| 1. Foundation                               | Next/Firebase/Emulators/CI instalados                       | lint, typecheck, unit e build verdes               |
| 2. Design system                            | Primitivas responsivas e acessíveis                         | testes de UI e auditoria básica de acessibilidade  |
| 3–5. Auth, identidade e Rules               | Contas recuperáveis, WillTreino ID seguro e regras testadas | Emulator Rules bloqueia todos os acessos indevidos |
| 6–9. Onboarding a treino solo               | Perfil, catálogo, plano e sessão individual utilizáveis     | fluxo de treino solo testado                       |
| 10–13. Convites e grupo                     | lobby, início sincronizado e descanso em grupo              | dois clientes recebem o mesmo `startAt`            |
| 14–16. Métricas, cardio e progressão        | estatística pessoal idempotente e evolução                  | rebuild confere com a fonte de verdade             |
| 17–20. Nutrição, offline, notificações e IA | extensões com providers e privacidade                       | credenciais opcionais com fallback seguro          |
| 21–23. Produto comercial                    | gamificação, admin e pagamentos isolados                    | autorização, auditoria e idempotência validadas    |
| 24–27. Hardening                            | segurança, acessibilidade, performance e operação           | checklist de produção aprovado                     |

O detalhamento por task — com dependências, arquivos, critérios e testes — é a fonte operacional em [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Decisões de escopo da primeira entrega

- O primeiro modo de grupo entregue será `SAME_WORKOUT`; `PARALLEL_WORKOUTS` fica atrás de feature flag e contrato arquitetural.
- O primeiro ciclo de dados de alimentos parte de `InternalFoodProvider`; integrações externas são adaptadores opt-in, sem alegar preço em tempo real.
- WillCoach só entra após engines e ferramentas de consulta read-only/minimamente necessárias estarem prontas.
- Não há UI administrativa, pagamentos, câmera ou módulo social antes de suas próprias fases.

## Definition of Done do produto

O cenário ponta a ponta descrito no requisito (duas contas, onboarding, convite, lobby, início com `startAt` único, séries privadas, cardio independente, encerramento idempotente e estatísticas de ambos) deve passar no ambiente de emuladores e em Playwright, junto dos gates das fases 24–27. A especificação detalhada permanece rastreada por tasks; nenhuma marcação de fase substitui esse cenário.
