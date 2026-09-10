"use client";

import { useRouter } from "next/navigation";

import { useAuthSession } from "@/features/auth/auth-session-provider";

import { TrainingInviteInbox } from "./training-invite-inbox";

export function AccountTrainingInvites() {
  const router = useRouter();
  const { user } = useAuthSession();

  if (!user) {
    return null;
  }

  return (
    <TrainingInviteInbox
      uid={user.uid}
      onAccepted={(groupSessionId) => router.push(`/group/${groupSessionId}`)}
    />
  );
}
