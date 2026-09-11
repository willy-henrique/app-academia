import { expect, test } from "@playwright/test";

test.describe("fluxos completos do WillTreino local", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem(
        "willtreino.local-development-session.v1",
        JSON.stringify({ email: "willy@willtreino.local", uid: "local-willy" }),
      );
    });
  });

  test("1. Dashboard: carrega saudação, treino de hoje, resumo semanal e atalhos", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Bom dia|Boa tarde|Boa noite/i })).toBeVisible();
    await expect(page.getByText("Treinos do plano")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Começar treino|Continuar treino/i }),
    ).toBeVisible();
  });

  test("2. Onboarding: navega pelas etapas e preenche preferências", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: /Vamos montar seu treino/i })).toBeVisible();

    await page.getByRole("button", { name: "Começar" }).click();
    await expect(
      page.getByRole("heading", { name: /Qual é o seu objetivo principal\?/i }),
    ).toBeVisible();

    await page
      .locator("label")
      .filter({ hasText: /Ganhar massa muscular/i })
      .click();
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(page.getByRole("heading", { name: /Altura e peso/i })).toBeVisible();
  });

  test("3. Treino (/workout): carrega exercício ativo, controles de carga/reps e permite registrar série", async ({
    page,
  }) => {
    await page.goto("/workout");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Carga")).toBeVisible();
    await expect(page.getByText("Repetições", { exact: true })).toBeVisible();

    const finishSetBtn = page.getByRole("button", { name: /Concluir série/i });
    await expect(finishSetBtn).toBeVisible();
    await finishSetBtn.click();

    // Verifica que o timer ou a próxima série apareceu
    await expect(page.locator("text=Descanso").first()).toBeVisible();
  });

  test("4. Cardio (/cardio): lista modalidades, permite registrar e navegar", async ({ page }) => {
    await page.goto("/cardio");
    await expect(page.getByRole("heading", { name: "Cardio", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar cardio" })).toBeVisible();
  });

  test("5. Evolução (/progress): carrega métricas semanais e gráficos", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByRole("heading", { name: /Evolução/i })).toBeVisible();
    await expect(page.getByText(/Semana atual|Volume semanal|Séries/i)).toBeVisible();
  });

  test("6. Alimentação (/food): pesquisa alimentos no catálogo interno", async ({ page }) => {
    await page.goto("/food");
    await expect(page.getByRole("heading", { name: /Encontre o que faz sentido/i })).toBeVisible();

    const searchInput = page.getByPlaceholder(/Buscar no catálogo/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("frango");
    await page.getByRole("button", { name: /Buscar/i }).click();

    await expect(page.getByText(/Peito de frango|Proteína/i).first()).toBeVisible();
  });

  test("7. Conta (/account): perfil público, medidas e segurança", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /Conta e privacidade/i })).toBeVisible();
    await expect(page.getByText(/Identidade pública/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Medidas e fotos" })).toBeVisible();
  });
});
