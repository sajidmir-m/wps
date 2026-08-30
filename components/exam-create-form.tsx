"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createExamAction } from "@/app/actions/exam";
import { Field, inputClass, btnPrimary } from "./ui";
import type { Group } from "@/lib/types";

export function ExamCreateForm({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const result = await createExamAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.id) router.push(`/admin/exams/${result.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label="Exam title">
        <input name="title" required placeholder="Industrial Training — Final Test" className={inputClass} />
      </Field>

      <Field label="Instructions for students (optional)">
        <textarea
          name="instructions"
          rows={3}
          placeholder="Read each question carefully. Do not leave this window."
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Duration (minutes)">
          <input name="duration" type="number" min={1} defaultValue={30} className={inputClass} />
        </Field>
        <Field label="Marks per correct">
          <input
            name="marksCorrect"
            type="number"
            step="0.25"
            min="0.25"
            defaultValue={1}
            className={inputClass}
          />
        </Field>
        <Field label="Penalty per wrong">
          <input
            name="marksWrong"
            type="number"
            step="0.25"
            min="0"
            defaultValue={0.25}
            className={inputClass}
          />
        </Field>
        <Field label="Group">
          <select name="groupId" className={inputClass}>
            <option value="">All students</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? (
        <p className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <div>
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Creating…" : "Create exam"}
        </button>
      </div>
    </form>
  );
}
