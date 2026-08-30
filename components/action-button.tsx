"use client";

import { useState, useTransition } from "react";

type ActionResult = { error?: string; ok?: boolean } | void;

/**
 * A button that runs a server action and shows whatever it complains about.
 * Plain `<form action={...}>` discards the return value, which would hide
 * messages like "add a question before publishing".
 */
export function ActionButton({
  action,
  fields,
  className,
  children,
  pendingLabel = "Working…",
  confirm,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  fields: Record<string, string>;
  className?: string;
  children: React.ReactNode;
  pendingLabel?: string;
  confirm?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    if (confirm && !window.confirm(confirm)) return;

    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);

    start(async () => {
      const result = await action(data);
      setError(result && result.error ? result.error : null);
    });
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={run} disabled={pending} className={className}>
        {pending ? pendingLabel : children}
      </button>
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </span>
  );
}
