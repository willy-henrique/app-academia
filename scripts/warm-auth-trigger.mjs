#!/usr/bin/env node
/**
 * O primeiro evento Auth inicia um worker separado no Functions Emulator.
 * Aquecemos esse worker e confirmamos o efeito observável antes dos testes
 * de integração, evitando que a primeira asserção seja uma corrida contra a
 * inicialização do ambiente (especialmente em repositórios no /mnt/c do WSL).
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const functionsHost = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
const projectId = process.env.GCLOUD_PROJECT ?? "willtreino-local";
const authTimeoutMs = Number(process.env.AUTH_TRIGGER_WARMUP_TIMEOUT_MS ?? 90_000);
const callableTimeoutMs = Number(process.env.CALLABLE_WARMUP_TIMEOUT_MS ?? 90_000);

if (!authHost || !firestoreHost) {
  console.error(
    "O aquecimento exige FIREBASE_AUTH_EMULATOR_HOST e FIRESTORE_EMULATOR_HOST definidos pelo Firebase Emulator.",
  );
  process.exit(2);
}

if (
  !Number.isFinite(authTimeoutMs) ||
  authTimeoutMs <= 0 ||
  !Number.isFinite(callableTimeoutMs) ||
  callableTimeoutMs <= 0
) {
  console.error("Os timeouts de aquecimento devem ser números positivos.");
  process.exit(2);
}

const email = `warmup-${crypto.randomUUID()}@willtreino.test`;
const response = await fetch(
  `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-api-key`,
  {
    body: JSON.stringify({
      email,
      password: "emulator-only-password",
      returnSecureToken: true,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  },
);

if (!response.ok) {
  console.error(`Não foi possível criar o usuário de aquecimento: HTTP ${response.status}.`);
  process.exit(1);
}

const payload = await response.json();
const uid = typeof payload.localId === "string" ? payload.localId : undefined;
const idToken = typeof payload.idToken === "string" ? payload.idToken : undefined;

if (!uid || !idToken) {
  console.error("O Authentication Emulator não retornou as credenciais do usuário de aquecimento.");
  process.exit(1);
}

initializeApp({ projectId });
const firestore = getFirestore();
const startedAt = Date.now();

let publicProfileSnapshot;

while (Date.now() - startedAt < authTimeoutMs) {
  const [nextPublicProfile, privateProfile] = await Promise.all([
    firestore.doc(`publicProfiles/${uid}`).get(),
    firestore.doc(`privateProfiles/${uid}`).get(),
  ]);

  if (nextPublicProfile.exists && privateProfile.exists) {
    publicProfileSnapshot = nextPublicProfile;
    break;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (!publicProfileSnapshot) {
  console.error(
    `O gatilho Auth não criou os perfis de aquecimento em ${authTimeoutMs} ms. Verifique os logs do Functions Emulator.`,
  );
  process.exit(1);
}

const publicUserId = publicProfileSnapshot.data()?.publicUserId;

if (typeof publicUserId !== "string") {
  console.error("O perfil de aquecimento não contém um WillTreino ID válido.");
  process.exit(1);
}

const callableStartedAt = Date.now();
let callableResponse;

try {
  callableResponse = await fetch(
    `http://${functionsHost}/${projectId}/southamerica-east1/resolvePublicUserId`,
    {
      body: JSON.stringify({ data: { publicUserId } }),
      headers: {
        authorization: `Bearer ${idToken}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(callableTimeoutMs),
    },
  );
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`A callable de aquecimento não respondeu: ${reason}`);
  process.exit(1);
}

if (!callableResponse.ok) {
  console.error(`A callable de aquecimento respondeu HTTP ${callableResponse.status}.`);
  process.exit(1);
}

console.log(
  `Gatilhos Auth e callable aquecidos e validados em ${Date.now() - startedAt} ms (callable: ${Date.now() - callableStartedAt} ms).`,
);
