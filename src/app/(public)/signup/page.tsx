"use client";

import { useRouter } from "next/navigation";

import { PublicAuthShell } from "@/components/layout/public-auth-shell";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { SignUpForm } from "@/features/auth/signup-form";

export default function SignUpPage() {
  const router = useRouter();

  return (
    <PublicAuthShell
      action={{ href: "/login", label: "Entrar" }}
      description="Comece um treino que respeita sua rotina, seu tempo e suas necessidades."
      eyebrow="Seu ponto de partida"
      title="Crie sua conta"
    >
      <SignUpForm onSuccess={() => router.replace("/onboarding")} />
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-wt-border" />
        <span className="wt-text-caption">ou</span>
        <span className="h-px flex-1 bg-wt-border" />
      </div>
      <GoogleSignInButton />
    </PublicAuthShell>
  );
}
