"use client";

import { useState, useTransition } from "react";
import { bulkAddStudentsAction } from "@/app/actions/admin";
import { btnPrimary, Field, inputClass } from "./ui";

export function BulkImport({
  groups,
}: {
  groups: { id: string; name: string }[];
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(formData) => {
        start(async () => {
          const result = await bulkAddStudentsAction(formData);
          if (result?.error) setMessage(result.error);
          else setMessage(`Added ${result?.added || 0} students. Skipped ${result?.skipped || 0}.`);
        });
      }}
    >
      <Field label="Assign to group">
        <select name="groupId" className={inputClass}>
          <option value="">No group yet</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Student list — one per line: Name, email">
        <textarea
          name="list"
          rows={8}
          className={inputClass}
          placeholder={"Aarav Sharma, aarav@college.edu\nDiya Patel, diya@college.edu\nKabir Singh"}
        />
      </Field>
      <p className="text-xs text-muted">
        Email is optional. If you do not provide one, a temporary email will be created. Each
        student gets their own random password — see them under <b>Student logins</b>.
      </p>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      <button disabled={pending} className={btnPrimary}>
        {pending ? "Adding…" : "Import students"}
      </button>
    </form>
  );
}
