"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { login } from "../actions";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in…" : "Log in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, null);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-800">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">Log in to manage your events.</p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@school.edu" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-violet-500 hover:text-violet-600">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <SubmitButton />
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs text-slate-400">or continue with</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>


      <p className="mt-8 text-center text-sm text-slate-500">
        New to DOMNI?{" "}
        <Link href="/signup" className="font-medium text-violet-500 hover:text-violet-600">
          Create an account
        </Link>
      </p>
    </div>
  );
}
