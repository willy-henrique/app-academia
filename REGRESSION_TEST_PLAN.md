# Plano de Testes de Regressão — WillTreino

Este plano deve ser executado integralmente após a aplicação das correções para certificar que os fluxos core do sistema permanecem 100% íntegros e funcionais.

---

## 1. Módulo: Autenticação & Identidade

- [ ] **Cadastro Válido:**
  - Registrar com novo e-mail e senha com 8+ caracteres.
  - Verificar redirecionamento imediato para a Etapa 1 do `/onboarding`.
- [ ] **Cadastro com E-mail Existente:**
  - Tentar cadastrar com `willydev01@gmail.com`.
  - Verificar se a mensagem *"Este email já possui uma conta"* é exibida em destaque e sem quebra de página.
- [ ] **Login Válido:**
  - Entrar com credenciais válidas.
  - Verificar redirecionamento para o `/dashboard`.
- [ ] **Persistência de Sessão:**
  - Dar reload (F5) no `/dashboard` e verificar se o estado logado permanece sem piscar a tela de login.
- [ ] **Logout Seguro:**
  - Clicar em "Sair" na aba Conta e verificar se a sessão foi revogada e o redirecionamento para `/login` ocorreu.
- [ ] **Proteção de Rotas (AuthGate):**
  - Deslogado, tentar acessar diretamente `/workout`, `/progress`, `/account`, `/food`.
  - Confirmar redirecionamento compulsório para `/login`.
- [ ] **WillTreino ID no Perfil Público:**
  - Acessar `/account` com conta nova e conta existente.
  - Confirmar que o card *"Meu WillTreino ID"* exibe o formato `WT-[A-Z0-9]{4}-[A-Z0-9]{4}` e o botão de cópia funciona.

---

## 2. Módulo: Onboarding

- [ ] **Navegação Progressiva:**
  - Avançar pelas 14 etapas preenchendo os dados essenciais.
  - Clicar em "Voltar" e verificar se as respostas anteriores continuam preenchidas (estado preservado).
- [ ] **Validação de Limites de Altura e Peso:**
  - Digitar `-10` ou `0` em altura e peso e confirmar que o sistema bloqueia o avanço com aviso explícito.
  - Digitar `175 cm` e `75 kg` e verificar avanço normal.
- [ ] **Conclusão do Onboarding:**
  - Concluir a última etapa e verificar se o status de rascunho passa para concluído e redireciona para o treino.

---

## 3. Módulo: Execução de Treino de Força

- [ ] **Carregamento da Sessão:**
  - Abrir `/workout` e verificar se o primeiro exercício ativo é exibido com séries e faixa de repetições.
- [ ] **Registro de Série:**
  - Preencher carga (ex: 24 kg) e reps (ex: 10) e clicar em "Concluir série".
  - Verificar se a série é marcada visualmente como verde e o aviso de sucesso aparece.
- [ ] **Cronômetro de Descanso:**
  - Verificar se o contador regressivo inicia automaticamente.
  - Clicar em "Pular descanso" e verificar se a próxima série fica disponível imediatamente.
- [ ] **Troca de Exercício (Swap):**
  - Clicar no botão "Trocar por [Alternativa]" e verificar se o exercício da fila é substituído sem travar o app.
- [ ] **WillCoach (Prescrição por IA):**
  - Clicar no botão "Gerar com IA" no topo do treino.
  - Verificar se a aba de Treino Prescrito e a aba de Dieta & Macros abrem com dados coerentes.
- [ ] **Finalização do Treino:**
  - Concluir todas as séries prescritas e clicar em "Finalizar treino".
  - Verificar se o resumo da sessão é exibido com tempo total e volume em kg.

---

## 4. Módulo: Cardio & Nutrição

- [ ] **Sessão de Cardio:**
  - Acessar `/cardio`, selecionar modalidade (ex: Caminhada, 15 min) e iniciar o timer.
  - Concluir ou pular com motivo e verificar histórico recente.
- [ ] **Diário de Alimentação:**
  - Acessar `/food`, pesquisar por "frango" e selecionar a opção correspondente.
  - Registrar porção de 150g no Almoço e verificar se o total diário de calorias e proteínas é recalculado.

---

## 5. Módulo: Evolução & Métricas

- [ ] **Volume por Treino (`/progress`):**
  - Acessar `/progress` e certificar que a seção de volume renderiza sem disparar o banner *"Não conseguimos carregar sua evolução"*.
  - Confirmar exibição do gráfico de barras ou do Empty State caso não haja treinos no histórico.
- [ ] **Recordes Pessoais (PRs):**
  - Confirmar listagem correta das maiores cargas registradas por exercício.

---

## 6. Módulo: Responsividade & Acessibilidade

- [ ] **Teste de Viewport Mobile (320px e 390px):**
  - Garantir ausência de barra de rolagem horizontal em todas as páginas.
  - Verificar que os botões de ação principal ("Concluir série", "Começar treino") são facilmente clicáveis com o polegar.
- [ ] **Navegação por Teclado:**
  - Percorrer as telas usando apenas a tecla `Tab` e verificar se o indicador de foco (`focus-visible`) está nítido.
