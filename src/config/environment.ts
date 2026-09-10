export const appEnvironments = ["development", "test", "staging", "production"] as const;

export type AppEnvironment = (typeof appEnvironments)[number];

export type RuntimeEnvironmentInput = Readonly<{
  appEnvironment?: string;
  nodeEnvironment?: string;
  useFirebaseEmulators?: string;
}>;

export type RuntimeEnvironment = Readonly<{
  name: AppEnvironment;
  useFirebaseEmulators: boolean;
}>;

function isAppEnvironment(value: string): value is AppEnvironment {
  return appEnvironments.includes(value as AppEnvironment);
}

export function resolveRuntimeEnvironment({
  appEnvironment,
  nodeEnvironment,
  useFirebaseEmulators,
}: RuntimeEnvironmentInput): RuntimeEnvironment {
  const candidate = appEnvironment ?? nodeEnvironment ?? "development";

  if (!isAppEnvironment(candidate)) {
    throw new Error(`Unsupported application environment: ${candidate}.`);
  }

  const usesEmulators = useFirebaseEmulators === "true";

  if (candidate === "test" && !usesEmulators) {
    throw new Error("Test environment must use Firebase emulators.");
  }

  if ((candidate === "staging" || candidate === "production") && usesEmulators) {
    throw new Error(`${candidate} environment cannot use Firebase emulators.`);
  }

  return { name: candidate, useFirebaseEmulators: usesEmulators };
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return resolveRuntimeEnvironment({
    appEnvironment: process.env.NEXT_PUBLIC_APP_ENV,
    nodeEnvironment: process.env.NODE_ENV,
    useFirebaseEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  });
}
