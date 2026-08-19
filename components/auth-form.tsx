"use client";

import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { btnPrimary, Field, inputClass } from "./ui";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" ? (
        <Field label="Full name">
          <input name="name" required className={inputClass} placeholder="Your name" />
        </Field>
      ) : null}
      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="you@college.edu"
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          minLength={4}
          className={inputClass}
          placeholder="Minimum 4 characters"
        />
      </Field>
      {state?.error ? (
        <p className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      ) : null}
      <button disabled={pending} className={`${btnPrimary} w-full`}>
        {pending
          ? "Please wait…"
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New student?{" "}
            <Link href="/signup" className="text-primary underline">
              Sign up with email
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
