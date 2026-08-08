"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@repo/shared";
import { FieldError } from "@/components/auth/field-error";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "@/hooks/useLogin";
import { getApiErrorMessage } from "@/lib/api";

export function LoginForm() {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit((values) => login.mutate(values))}
    >
      {login.isError ? (
        <FormAlert message={getApiErrorMessage(login.error)} />
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <>
            <Spinner />
            Logging in...
          </>
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}
