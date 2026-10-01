"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Card, CardHeader, Field, Input } from "@/components/ui/primitives";
import type { CurrentUser } from "@/lib/api/types";
import { getSession, setSession } from "@/lib/session";

const SA_MOBILE = /^(\+27|0)[6-8]\d{8}$/;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name as colleagues know you."),
  mobile: z
    .string()
    .refine((v) => SA_MOBILE.test(v.replace(/[\s()-]/g, "")), "Enter a South African mobile number, like 082 555 0142 or +27 82 555 0142."),
  jobTitle: z.string().trim().max(60, "Keep your job title under 60 characters."),
});
type Values = z.infer<typeof schema>;

export function ProfileCard({ user }: { user: CurrentUser }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: user.name, mobile: "+27 82 555 4471", jobTitle: "Head of credit operations" },
  });

  // Mock save — there's no profile endpoint in the API contract yet.
  const save = useMutation({
    mutationFn: async (v: Values) => {
      await new Promise((r) => setTimeout(r, 600));
      return { ...v, name: v.name.trim(), jobTitle: v.jobTitle.trim() };
    },
    onSuccess: (v) => {
      const s = getSession();
      if (s?.user) setSession({ ...s, user: { ...s.user, name: v.name } });
      reset(v);
    },
  });

  return (
    <Card className="p-5 md:p-6" aria-labelledby="profile-title">
      <CardHeader id="profile-title" title="Profile" description="How you appear to colleagues and to Mettus support." />
      <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="mt-6">
        <fieldset disabled={save.isPending} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name?.message}>
              <Input autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
            </Field>
            <Field label="Work email" hint="Your admin can change the email you sign in with.">
              <Input type="email" value={user.email} readOnly aria-readonly className="bg-surface-2 text-muted" />
            </Field>
            <Field
              label="Mobile number"
              required
              error={errors.mobile?.message}
              hint="One-time sign-in codes go to this number."
            >
              <Input type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.mobile} {...register("mobile")} />
            </Field>
            <Field label="Job title" error={errors.jobTitle?.message}>
              <Input autoComplete="organization-title" placeholder="e.g. Credit analyst" aria-invalid={!!errors.jobTitle} {...register("jobTitle")} />
            </Field>
          </div>
        </fieldset>
        {save.isSuccess && !isDirty && (
          <Alert tone="success" className="mt-5" onDismiss={() => save.reset()}>
            Profile saved. Your name updates everywhere you&apos;re signed in.
          </Alert>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-ink/10 pt-5 sm:flex-row sm:justify-end">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}
