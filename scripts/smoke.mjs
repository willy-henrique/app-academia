#!/usr/bin/env node
/**
 * Smoke test de deploy web. Verifica apenas o que é público e não cria dado algum:
 * nenhuma conta é criada, nenhum treino é escrito, nenhuma credencial é usada.
 *
 * Uso: node scripts/smoke.mjs https://app.exemplo.com
 */

const baseUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.error("Informe a URL: node scripts/smoke.mjs https://seu-app");
  process.exit(2);
}

const checks = [
  { expectStatus: 200, name: "home", path: "/" },
  { expectStatus: 200, name: "login", path: "/login" },
  { expectStatus: 200, name: "cadastro", path: "/signup" },
  { expectStatus: 200, name: "recuperação de senha", path: "/forgot-password" },
  { expectStatus: 200, name: "offline", path: "/offline" },
];

const requiredHeaders = [
  "content-security-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
];

let failures = 0;

for (const check of checks) {
  const url = new URL(check.path, baseUrl).toString();

  try {
    const started = Date.now();
    const response = await fetch(url, { redirect: "manual" });
    const elapsed = Date.now() - started;

    if (response.status !== check.expectStatus) {
      failures += 1;
      console.error(
        `✗ ${check.name}: ${response.status} (esperado ${check.expectStatus}) — ${url}`,
      );
      continue;
    }

    const type = response.headers.get("content-type") ?? "";
    if (check.contentTypes && !check.contentTypes.some((expected) => type.includes(expected))) {
      failures += 1;
      console.error(`✗ ${check.name}: content-type "${type}" — ${url}`);
      continue;
    }

    console.log(`✓ ${check.name} (${response.status}, ${elapsed} ms)`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${check.name}: ${error instanceof Error ? error.message : error}`);
  }
}

try {
  const response = await fetch(new URL("/login", baseUrl).toString(), { redirect: "manual" });
  const missing = requiredHeaders.filter((header) => !response.headers.get(header));

  if (missing.length > 0) {
    failures += 1;
    console.error(`✗ headers de segurança ausentes: ${missing.join(", ")}`);
  } else {
    console.log("✓ headers de segurança presentes");
  }
} catch (error) {
  failures += 1;
  console.error(`✗ headers: ${error instanceof Error ? error.message : error}`);
}

try {
  const response = await fetch(new URL("/", baseUrl).toString(), { redirect: "manual" });
  const html = await response.text();
  const hasPwaManifest = html.includes("manifest.webmanifest");

  if (hasPwaManifest) {
    failures += 1;
    console.error("✗ entrega web-only: a home ainda referencia um manifest PWA");
  } else {
    console.log("✓ entrega web-only sem manifest PWA");
  }
} catch (error) {
  failures += 1;
  console.error(`✗ entrega web-only: ${error instanceof Error ? error.message : error}`);
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exit(1);
}

console.log("\nSmoke test aprovado.");
