import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  InvalidFirebaseAuthTokenError,
  MissingFirebaseAuthTokenError,
  requireFirebaseAuth,
} from "@/lib/auth/server";
import { getFirebaseAdminServices } from "@/infrastructure/firebase/admin";
import { publicProfileSchema } from "@/domain/identity/public-profile";
import { generatePublicUserId, normalizePublicUserId } from "@/domain/identity/public-user-id";

function isAuthenticationFailure(error: unknown): boolean {
  return (
    error instanceof MissingFirebaseAuthTokenError || error instanceof InvalidFirebaseAuthTokenError
  );
}

export async function GET(request: Request) {
  try {
    const decodedToken = await requireFirebaseAuth(request.headers);
    const { firestore } = getFirebaseAdminServices();
    const profileRef = firestore.doc(`publicProfiles/${decodedToken.uid}`);
    const snapshot = await profileRef.get();

    if (!snapshot.exists) {
      // Provisionamento JIT: Garante que contas criadas via Auth recebam perfil e WillTreino ID
      // com proteção contra colisão e concorrência via transação atômica.
      let createdProfileData: unknown = null;

      for (let attempt = 0; attempt < 8; attempt++) {
        const publicUserId = generatePublicUserId();
        const normalized = normalizePublicUserId(publicUserId);
        const indexRef = firestore.doc(`publicUserIdIndex/${normalized}`);

        try {
          await firestore.runTransaction(async (transaction) => {
            const indexSnap = await transaction.get(indexRef);
            if (indexSnap.exists) {
              throw new Error("collision");
            }

            const existingProfileSnap = await transaction.get(profileRef);
            if (existingProfileSnap.exists) {
              createdProfileData = existingProfileSnap.data();
              return;
            }

            const rawName = decodedToken.name || (decodedToken.email ? decodedToken.email.split("@")[0] : null);
            const displayName = rawName ? rawName.trim() : "Atleta WillTreino";
            const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || null;

            const newProfile = {
              avatar: decodedToken.picture ?? null,
              badgesPublic: [],
              createdAt: FieldValue.serverTimestamp(),
              displayName,
              publicUserId,
              updatedAt: FieldValue.serverTimestamp(),
              username,
            };

            transaction.set(indexRef, {
              createdAt: FieldValue.serverTimestamp(),
              publicUserId,
              uid: decodedToken.uid,
              updatedAt: FieldValue.serverTimestamp(),
            });

            transaction.set(profileRef, newProfile);
            createdProfileData = newProfile;
          });

          if (createdProfileData) {
            break;
          }
        } catch (err) {
          if (err instanceof Error && err.message === "collision") {
            continue;
          }
          throw err;
        }
      }

      if (createdProfileData) {
        const data = publicProfileSchema.parse(createdProfileData);
        return NextResponse.json({
          accountState: "ACTIVE" as const,
          avatar: data.avatar,
          displayName: data.displayName,
          publicUserId: data.publicUserId,
        });
      }

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

    console.error("[api/me/public-profile] falha ao montar o perfil público:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
