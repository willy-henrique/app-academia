import { defineConfig, devices } from "@playwright/test";

// `localhost` coincide com a origem do Next em desenvolvimento; usar 127.0.0.1
// bloqueia o cliente/HMR pelas proteções de origem cruzada do Next 16.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Os E2E cobrem a experiência local e não podem herdar as credenciais do
// `.env.local` do desenvolvedor. Forçar esse modo no processo que compila o
// Next torna a suíte reproduzível e impede qualquer chamada ao Firebase real.
const localE2eEnvironment = {
  ...process.env,
  NEXT_PUBLIC_APP_ENV: "development",
  NEXT_PUBLIC_AUTH_MODE: "local",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "false",
  NEXT_PUBLIC_FIREBASE_API_KEY: "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "",
};

export default defineConfig({
  // Os fluxos de navegador são sequenciais para manter os dados locais de cada
  // cenário totalmente isolados.
  fullyParallel: false,
  outputDir: "test-results",
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 1,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // O build de produção é validado separadamente por `npm run build`.
        // Aqui o dev server reduz o ciclo de feedback, mantendo a configuração
        // isolada de Firebase acima.
        command: "npm run dev:watch",
        env: localE2eEnvironment,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: baseURL,
      },
});
