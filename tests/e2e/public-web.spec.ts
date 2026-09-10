import { expect, test } from "@playwright/test";

test.describe("entrega web pública", () => {
  test("apresenta a home e não registra manifest de PWA", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/WillTreino/);
    await expect(page.getByRole("heading", { name: /Menos dúvida/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Criar minha conta/i })).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  });

  test("valida a senha mínima de seis caracteres sem requisitar Firebase", async ({ page }) => {
    await page.goto("/signup");

    await page.getByLabel("Email").fill("teste@willtreino.local");
    await page.getByLabel("Senha", { exact: true }).fill("12345");
    await page.getByLabel("Confirmar senha").fill("12345");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(
      page.getByText("A senha precisa ter ao menos 6 caracteres.", { exact: true }),
    ).toBeVisible();
  });

  test("permite entrar localmente enquanto o Firebase Auth não está configurado", async ({
    page,
  }) => {
    await page.goto("/signup");

    await page.getByLabel("Email").fill("willy@willtreino.local");
    await page.getByLabel("Senha", { exact: true }).fill("123456");
    await page.getByLabel("Confirmar senha").fill("123456");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText(/Modo local de desenvolvimento/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Vamos montar seu treino/i })).toBeVisible();
  });

  test("mantém as rotas públicas essenciais navegáveis", async ({ page }) => {
    for (const path of ["/login", "/signup", "/forgot-password", "/verify-email", "/offline"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
