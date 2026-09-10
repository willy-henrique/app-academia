import { NextResponse } from "next/server";

import {
  InvalidFirebaseAuthTokenError,
  MissingFirebaseAuthTokenError,
  requireFirebaseAuth,
} from "@/lib/auth/server";
import { getFirebaseAdminServices } from "@/infrastructure/firebase/admin";
import { publicProfileSchema } from "@/domain/identity/public-profile";

function isAuthenticationFailure(error: unknown): boolean {
  return (
    error instanceof MissingFirebaseAuthTokenError || error instanceof InvalidFirebaseAuthTokenError
  );
}

export async function GET(request: Request) {
  try {
    const decodedToken = await requireFirebaseAuth(request.headers);
    const { firestore } = getFirebaseAdminServices();
    const snapshot = await firestore.doc(`publicProfiles/${decodedToken.uid}`).get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = publicProfileSchema.parse(snapshot.data());
    return NextResponse.json({
      accountState: "ACTIVE" as const,
      avatar: data.avatar,
      displayName: data.displayName,
      publicUserId: data.publicUserId,
    });
  } catch (error) {
    if (isAuthenticationFailure(error)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Falhas de configuração (credencial de Admin ausente), de Firestore ou de
    // schema não são culpa de quem chamou. Responder 401 aqui manda o usuário
    // relogar para sempre e esconde o problema real do servidor.
    console.error("[api/me/public-profile] falha ao montar o perfil público:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
