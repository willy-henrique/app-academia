import "server-only";

import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

export type FirebaseAdminEnvironment = Readonly<{
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}>;

type FirebaseAdminConfiguration = Readonly<{
  projectId: string;
  serviceAccount?: Readonly<{
    projectId: string;
    clientEmail: string;
    privateKey: string;
  }>;
}>;

const firebaseAdminEnvironment: FirebaseAdminEnvironment = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
};

export function readFirebaseAdminConfiguration(
  environment: FirebaseAdminEnvironment = firebaseAdminEnvironment,
): FirebaseAdminConfiguration {
  const { clientEmail, privateKey, projectId } = environment;

  if (!projectId) {
    throw new Error("Firebase Admin configuration is incomplete: projectId.");
  }

  const hasClientEmail = Boolean(clientEmail);
  const hasPrivateKey = Boolean(privateKey);

  if (hasClientEmail !== hasPrivateKey) {
    throw new Error(
      "Firebase Admin configuration requires both clientEmail and privateKey when using a service account.",
    );
  }

  if (clientEmail && privateKey) {
    return {
      projectId,
      serviceAccount: {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      },
    };
  }

  return { projectId };
}

function createFirebaseAdminOptions(configuration: FirebaseAdminConfiguration): AppOptions {
  if (configuration.serviceAccount) {
    return {
      projectId: configuration.projectId,
      credential: cert(configuration.serviceAccount),
    };
  }

  return {
    projectId: configuration.projectId,
    credential: applicationDefault(),
  };
}

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(createFirebaseAdminOptions(readFirebaseAdminConfiguration()));
}

export type FirebaseAdminServices = Readonly<{
  app: App;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
}>;

export function getFirebaseAdminServices(): FirebaseAdminServices {
  const app = getFirebaseAdminApp();

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };
}
