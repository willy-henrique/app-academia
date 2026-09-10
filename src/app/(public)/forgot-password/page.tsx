import Link from "next/link";

import { PublicAuthShell } from "@/components/layout/public-auth-shell";
import { PasswordResetForm } from "@/features/auth/password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <PublicAuthShell
      action={{ href: "/login", label: "Entrar" }}
      description="Informe seu email para receber as instruções de acesso."
      eyebrow="Acesso à sua conta"
      title="Redefinir senha"
    >
      <PasswordResetForm />
      <Link
        className="mt-5 inline-block font-semibold text-wt-accent-active underline"
        href="/login"
      >
        Voltar para entrar
      </Link>
    </PublicAuthShell>
  );
}
