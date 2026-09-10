"use client";

import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type FirebaseClientEnvironment = Readonly<{
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}>;

const firebaseClientEnvironment: FirebaseClientEnvironment = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseFunctionsRegion = "southamerica-east1";

const requiredClientConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const satisfies readonly (keyof FirebaseClientEnvironment)[];

/**
 * Confere apenas as variáveis de ambiente, sem tocar no `window`. É seguro
 * chamar durante o render (servidor e cliente veem o mesmo valor embutido),
 * então a UI pode decidir de imediato se o Firebase está utilizável.
 */
export function hasFirebaseClientConfig(
  environment: FirebaseClientEnvironment = firebaseClientEnvironment,
): boolean {
  return requiredClientConfigKeys.every((key) => Boolean(environment[key]));
}

export function readFirebaseClientConfig(
  environment: FirebaseClientEnvironment = firebaseClientEnvironment,
): FirebaseOptions {
  const missingKeys = requiredClientConfigKeys.filter((key) => !environment[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Firebase client configuration is incomplete: ${missingKeys.join(", ")}.`);
  }

  return {
    apiKey: environment.apiKey,
    authDomain: environment.authDomain,
    projectId: environment.projectId,
    storageBucket: environment.storageBucket,
    messagingSenderId: environment.messagingSenderId,
    appId: environment.appId,
  } as FirebaseOptions;
}

function assertBrowserEnvironment(): void {
  if (typeof window === "undefined") {
    throw new Error("Firebase client services can only be initialized in a browser.");
  }
}

export function getFirebaseClientApp(): FirebaseApp {
  assertBrowserEnvironment();

  return getApps().length > 0 ? getApp() : initializeApp(readFirebaseClientConfig());
}

export type FirebaseClientServices = Readonly<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
}>;

export function getFirebaseClientServices(): FirebaseClientServices {
  const app = getFirebaseClientApp();

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    functions: getFunctions(app, firebaseFunctionsRegion),
    storage: getStorage(app),
  };
}
