"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { authCopy } from "./auth-copy";
import {
  passwordResetSchema,
  requestPasswordReset,
  type PasswordResetInput,
} from "./password-reset";

type PasswordResetFormProps = {
  requestReset?: (input: PasswordResetInput) => Promise<void>;
};

export function PasswordResetForm({ requestReset = requestPasswordReset }: PasswordResetFormProps) {
  const [message, setMessage] = useState<string>();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordResetInput>({ resolver: zodResolver(passwordResetSchema) });

  const submit = handleSubmit(async (input) => {
    setMessage(undefined);
    await requestReset(input);
    setMessage(authCopy.passwordResetNeutral);
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
      <Button className="w-full" loading={isSubmitting} size="large" type="submit">
        Enviar instruções
      </Button>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </form>
  );
}
