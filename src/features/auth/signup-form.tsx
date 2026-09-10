"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { authCopy } from "./auth-copy";
import { signUpSchema, signUpWithEmail, type SignUpInput } from "./signup";

type SignUpFormProps = {
  onSuccess?: () => void;
  submitAccount?: (input: SignUpInput) => Promise<void>;
};

export function SignUpForm({ onSuccess, submitAccount = signUpWithEmail }: SignUpFormProps) {
  const [submitMessage, setSubmitMessage] = useState<string>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const submit = handleSubmit(async (input) => {
    setSubmitMessage(undefined);

    try {
      await submitAccount(input);
      setSubmitMessage(authCopy.signupSuccess);
      onSuccess?.();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : authCopy.genericSignupFailure);
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
        autoComplete="new-password"
        error={errors.password?.message}
        label="Senha"
        hint="Use ao menos 6 caracteres."
        type="password"
        {...register("password")}
      />
      <Input
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        label="Confirmar senha"
        type="password"
        {...register("confirmPassword")}
      />
      {submitMessage ? (
        <LiveRegion politeness="assertive" visible>
          {submitMessage}
        </LiveRegion>
      ) : null}
      <Button className="w-full" loading={isSubmitting} size="large" type="submit">
        Criar conta
      </Button>
    </form>
  );
}
