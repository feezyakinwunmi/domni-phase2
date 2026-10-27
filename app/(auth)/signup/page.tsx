"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signUp } from "../actions";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signUp, null);
  const [role, setRole] = useState<"ATTENDEE" | "ORGANIZER">("ATTENDEE");

  if (state?.success) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink-800">Check your inbox</h1>
        <p className="mt-3 text-sm text-slate-500">{state.success}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-800">Create your account</h1>
      <p className="mt-2 text-sm text-slate-500">Start selling tickets in minutes.</p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-1">
        {(["ATTENDEE", "ORGANIZER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-colors",
              role === r ? "bg-white text-ink-800 shadow-soft" : "text-slate-500"
            )}
          >
            {r === "ATTENDEE" ? "I'm attending events" : "I'm creating events"}
          </button>
        ))}
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="role" value={role} />
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" placeholder="Ada Nwosu" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@school.edu" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" required />
        </div>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <SubmitButton />
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs text-slate-400">or continue with</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      <OAuthButtons />

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-500 hover:text-violet-600">
          Log in
        </Link>
      </p>
    </div>
  );
}
