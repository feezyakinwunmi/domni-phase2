"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { requestPasswordReset } from "../actions";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink-800">Check your inbox</h1>
        <p className="mt-3 text-sm text-slate-500">{state.success}</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-violet-500 hover:text-violet-600">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-800">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-500">
        Enter your email and we'll send you a link to reset it.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@school.edu" required />
        </div>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <SubmitButton />
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-violet-500 hover:text-violet-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
