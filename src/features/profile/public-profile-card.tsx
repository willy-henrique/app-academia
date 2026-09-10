"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
      <Card className="space-y-2 p-5" elevated>
        <h2 className="wt-text-h2">Perfil local de desenvolvimento</h2>
        <p className="text-wt-body-sm text-wt-text-secondary-strong">
          Você está usando o app sem o Firebase. O WillTreino ID, parceiros e dados sincronizados
          aparecem quando a autenticação Firebase for habilitada.
        </p>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="public-profile-title" className="space-y-5 p-5" elevated>
      <div className="flex items-center gap-4">
        {profile ? (
          <Avatar name={profile.displayName} size="lg" />
        ) : (
          <Skeleton className="size-16 rounded-wt-full" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="wt-text-caption font-semibold" id="public-profile-title">
            Meu WillTreino ID
          </h2>
          {profile ? (
            <>
              <p className="truncate wt-text-h2">{profile.displayName}</p>
              {profile.accountState === "ACTIVE" ? <Badge tone="success">Conta ativa</Badge> : null}
            </>
          ) : error ? null : (
            <Skeleton className="h-6 w-40" />
          )}
        </div>
      </div>
      {error ? (
        <p className="rounded-wt-lg bg-wt-danger-subtle px-4 py-3 text-wt-body-sm text-wt-danger-text">
          {error}
        </p>
      ) : profile ? (
        <div className="space-y-2">
          <CopyPublicUserIdButton publicUserId={profile.publicUserId} />
          <p className="wt-text-caption text-wt-text-secondary-strong">
            É o único identificador que você precisa passar para treinar com alguém.
          </p>
        </div>
      ) : (
        <Skeleton className="h-14 w-full rounded-wt-lg" />
      )}
    </Card>
  );
}
