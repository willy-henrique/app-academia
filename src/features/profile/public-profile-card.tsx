"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuthSession } from "@/features/auth/auth-session-provider";

import { CopyPublicUserIdButton } from "./copy-public-user-id-button";

type PublicProfileResponse = {
  accountState: "ACTIVE";
  avatar: string | null;
  displayName: string;
  publicUserId: string;
};

export function PublicProfileCard() {
  const { mode, user } = useAuthSession();
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        if (!user || mode === "local") {
          throw new Error("user-missing");
        }

        const token = await user.getIdToken?.();
        if (!token) {
          throw new Error("token-missing");
        }
        const response = await fetch("/api/me/public-profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("profile-unavailable");
        }

        const data = (await response.json()) as PublicProfileResponse;
        if (isMounted) {
          setProfile(data);
        }
      } catch {
        if (isMounted) {
          setError("Não foi possível carregar seu perfil público agora.");
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [mode, user]);

  if (mode === "local") {
    return (
      <Card className="space-y-3" elevated>
        <h2 className="wt-text-title">Perfil local de desenvolvimento</h2>
        <p className="wt-text-body text-wt-text-secondary">
          Você está usando o app sem o Firebase. O WillTreino ID, parceiros e dados sincronizados
          aparecem quando a autenticação Firebase for habilitada.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5" elevated>
      <div className="space-y-2">
        <h2 className="wt-text-title">Meu WillTreino ID</h2>
        <p className="wt-text-body text-wt-text-secondary">
          Este é o ID público que você compartilha com parceiros de treino.
        </p>
      </div>
      {error ? (
        <p className="wt-text-body text-wt-danger">{error}</p>
      ) : profile ? (
        <div className="space-y-4">
          <div className="rounded-wt-md border border-wt-border bg-wt-surface p-4">
            <p className="wt-text-label text-wt-text-secondary">Nome público</p>
            <p className="wt-text-body">{profile.displayName}</p>
            <p className="wt-text-caption">
              Conta {profile.accountState === "ACTIVE" ? "ativa" : ""}
            </p>
          </div>
          <CopyPublicUserIdButton publicUserId={profile.publicUserId} />
        </div>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </Card>
  );
}
