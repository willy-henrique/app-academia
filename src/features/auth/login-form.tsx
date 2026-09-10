"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { authCopy } from "./auth-copy";
import { loginSchema, loginWithEmail, type LoginInput } from "./login";

type LoginFormProps = {
  login?: (input: LoginInput) => Promise<void>;
  onSuccess?: () => void;
};

export function LoginForm({ login = loginWithEmail, onSuccess }: LoginFormProps) {
  const [submitMessage, setSubmitMessage] = useState<string>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const submit = handleSubmit(async (input) => {
    setSubmitMessage(undefined);

    try {
      await login(input);
      onSuccess?.();
    } catch {
      setSubmitMessage(authCopy.genericLoginFailure);
    }
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <Input
        autoComplete="email"
        error={errors.email?.message}
        label="Email"
        type="email"
        {...register("email")}
      />
      <Input
        autoComplete="current-password"
        error={errors.password?.message}
        label="Senha"
        type="password"
        {...register("password")}
      />
      {submitMessage ? (
        <LiveRegion politeness="assertive" visible>
          {submitMessage}
        </LiveRegion>
      ) : null}
      <Button className="w-full" loading={isSubmitting} size="large" type="submit">
        Entrar
      </Button>
    </form>
  );
}
