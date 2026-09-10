import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PublicProfilePreview } from "@/domain/identity/public-profile";

type TrainingInvitePreviewCardProps = Readonly<{
  actions?: ReactNode;
  heading?: string;
  preview: PublicProfilePreview;
}>;

/**
 * Renders only the minimal, non-sensitive preview a partner lookup returns:
 * display name, WillTreino ID and account state. Never shows UID, e-mail or any
 * private profile data.
 */
export function TrainingInvitePreviewCard({
  actions,
  heading = "Parceiro encontrado",
  preview,
}: TrainingInvitePreviewCardProps) {
  const active = preview.accountState === "ACTIVE";

  return (
    <div className="wt-pop-in space-y-4 rounded-wt-lg border border-wt-accent-border bg-wt-accent-subtle/40 p-4">
      <h3 className="text-wt-label font-semibold text-wt-accent-text">{heading}</h3>
      <div className="flex items-center gap-3">
        <Avatar name={preview.displayName} />
        <dl className="m-0 min-w-0 flex-1">
          <dt className="sr-only">Nome</dt>
          <dd className="m-0 truncate wt-text-h3">{preview.displayName}</dd>
          <dt className="sr-only">WillTreino ID</dt>
          <dd className="m-0 font-mono text-wt-body-sm tracking-wide text-wt-text-secondary-strong">
            {preview.publicUserId}
          </dd>
        </dl>
        <div className="shrink-0 text-right">
          <span className="sr-only">Conta: </span>
          <Badge tone={active ? "success" : "neutral"}>{active ? "Ativa" : "Indisponível"}</Badge>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
