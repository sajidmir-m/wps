"use client";

import { useState, useTransition } from "react";
import { updateExamAction } from "@/app/actions/exam";
import { Field, inputClass, btnPrimary } from "./ui";
import type { Exam, Group } from "@/lib/types";

export function ExamSettingsForm({ exam, groups }: { exam: Exam; groups: Group[] }) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const result = await updateExamAction(formData);
      setMessage(
        result?.error
          ? { text: result.error, ok: false }
          : { text: "Settings saved.", ok: true },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="id" value={exam.id} />

      <Field label="Exam title">
        <input name="title" defaultValue={exam.title} required className={inputClass} />
      </Field>

      <Field label="Instructions for students">
        <textarea
          name="instructions"
          rows={3}
          defaultValue={exam.instructions ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Duration (minutes)">
          <input
            name="duration"
            type="number"
            min={1}
            defaultValue={exam.duration_minutes}
            className={inputClass}
          />
        </Field>
        <Field label="Marks per correct">
          <input
            name="marksCorrect"
            type="number"
            step="0.25"
            min="0.25"
            defaultValue={exam.marks_correct}
            className={inputClass}
          />
        </Field>
        <Field label="Penalty per wrong">
          <input
            name="marksWrong"
            type="number"
            step="0.25"
            min="0"
            defaultValue={exam.marks_wrong}
            className={inputClass}
          />
        </Field>
        <Field label="Group">
          <select name="groupId" defaultValue={exam.group_id ?? ""} className={inputClass}>
            <option value="">All students</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div>
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
