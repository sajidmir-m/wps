"use client";

import { useState, useTransition } from "react";
import { resetAllPasswordsAction } from "@/app/actions/admin";
import { btnGhost } from "./ui";

export function ResetAllPasswords({ missing }: { missing: number }) {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const result = await resetAllPasswordsAction();
      setConfirming(false);
      setMessage(
        result?.error
          ? result.error
          : `Generated a new password for ${result?.updated ?? 0} students.`,
      );
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
      {message ? <p className="mt-2 text-sm text-success">{message}</p> : null}
    </div>
  );
}
