import { PublicAuthShell } from "@/components/layout/public-auth-shell";
import { EmailVerificationCard } from "@/features/auth/email-verification-card";

export default function VerifyEmailPage() {
  return (
    <PublicAuthShell>
      <EmailVerificationCard />
    </PublicAuthShell>
  );
}
