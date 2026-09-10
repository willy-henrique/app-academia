"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PublicAuthShell } from "@/components/layout/public-auth-shell";
import { GoogleSignInButton } from "@/features/auth/google-sign-in-button";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  const router = useRouter();

  return (
    <PublicAuthShell
      action={{ href: "/signup", label: "Criar conta" }}
      description="Entre para continuar seu treino."
      title="Que bom ter você aqui"
    >
      <LoginForm onSuccess={() => router.replace("/dashboard")} />
      <Link
        className="mt-4 inline-block font-semibold text-wt-accent-text underline"
        href="/forgot-password"
      >
        Esqueci minha senha
      </Link>
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-wt-border" />
        <span className="wt-text-caption">ou</span>
        <span className="h-px flex-1 bg-wt-border" />
      </div>
      <GoogleSignInButton
        onSuccess={(result) => {
          if (result !== "REDIRECT_STARTED") {
            router.replace("/dashboard");
          }
        }}
      />
      <p className="wt-text-body mt-5 text-wt-text-secondary-strong">
        Ainda não tem conta?{" "}
        <Link className="font-semibold text-wt-accent-text underline" href="/signup">
          Criar conta
        </Link>
      </p>
    </PublicAuthShell>
  );
}
