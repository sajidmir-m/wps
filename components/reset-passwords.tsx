"use client";

import { useState, useTransition } from "react";
import { resetAllPasswordsAction } from "@/app/actions/admin";
import { btnGhost } from "./ui";

export function ResetAllPasswords({ missing }: { missing: number }) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const result = await resetAllPasswordsAction();
      setConfirming(false);

      if (result?.error) {
        setMessage({ text: result.error, ok: false });
        return;
      }

      const updated = result?.updated ?? 0;
      const failed = result?.failed ?? 0;
      setMessage({
        text: failed
          ? `Generated a new password for ${updated} students. ${failed} could not be saved — check that 002_student_credentials.sql has been run in Supabase. Those students kept their old password.`
          : `Generated a new password for ${updated} students.`,
        ok: failed === 0,
      });
    });
  }

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-danger">
            This replaces every student&rsquo;s password. Old slips stop working.
          </span>
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Generating…" : "Yes, generate all"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={btnGhost}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={btnGhost}>
          {missing > 0 ? `Generate passwords (${missing} missing)` : "Generate new passwords"}
        </button>
      )}
      {message ? (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
