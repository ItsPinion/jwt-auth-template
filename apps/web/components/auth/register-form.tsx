"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Presentation } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { registerSchema, type RegisterInput } from "@repo/shared";
import { FieldError } from "@/components/auth/field-error";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { useRegister } from "@/hooks/useRegister";
import { getApiErrorMessage } from "@/lib/api";

type RegisterFormValues = z.input<typeof registerSchema>;

const roleOptions = [
  {
    value: "student",
    label: "Student",
    description: "Take quizzes and track progress",
    icon: GraduationCap,
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Create quizzes and view results",
    icon: Presentation,
  },
] as const;

export function RegisterForm() {
  const registerUser = useRegister();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", role: "student" },
  });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit((values) => registerUser.mutate(values))}
    >
      {registerUser.isError ? (
        <FormAlert message={getApiErrorMessage(registerUser.error)} />
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      <div className="space-y-2">
        <Label id="role-label">I am joining as</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <RadioGroup
              aria-labelledby="role-label"
              className="grid grid-cols-2 gap-3"
              value={field.value}
              onValueChange={field.onChange}
            >
              {roleOptions.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`role-${option.value}`}
                  className="flex cursor-pointer flex-col items-start gap-2 rounded-lg border bg-background p-3 transition-colors duration-200 hover:bg-muted/50 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/[0.04] has-[[data-state=checked]]:ring-3 has-[[data-state=checked]]:ring-primary/10"
                >
                  <span className="flex w-full items-center justify-between">
                    <option.icon
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <RadioGroupItem
                      value={option.value}
                      id={`role-${option.value}`}
                    />
                  </span>
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs leading-snug font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        <FieldError id="role-error" message={errors.role?.message} />
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={registerUser.isPending}
      >
        {registerUser.isPending ? (
          <>
            <Spinner />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
