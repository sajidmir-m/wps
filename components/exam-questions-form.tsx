"use client";

import { useRef, useState, useTransition } from "react";
import { addQuestionsAction } from "@/app/actions/exam";
import { inputClass, btnPrimary } from "./ui";

const STARRED_EXAMPLE = `Which instrument measures shaft diameter accurately?
Try square
*Vernier caliper
Spirit level
Measuring tape

What does PPE stand for in workshop safety?
*Personal Protective Equipment
Power Plant Engineering
Precision Part Estimation
Public Product Evaluation`;

const ANSWER_KEY_EXAMPLE = `### 1. What is the Internet?

A. A collection of only websites
B. A global network of interconnected computers
C. A programming language
D. A browser

**Answer: B**`;

export function ExamQuestionsForm({ examId }: { examId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("examId", examId);

    start(async () => {
      const result = await addQuestionsAction(formData);
      if (result?.error) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      formRef.current?.reset();
      setMessage({ text: `Added ${result?.added ?? 0} questions.`, ok: true });
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="mb-3 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
        <p className="font-medium text-ink">How to paste questions</p>
        <p className="mt-1">
          Either format works, and both are detected automatically. Every question needs between 2
          and 6 options.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="font-medium text-ink">Answer key style</p>
            <p className="mt-1 text-xs">
              Numbered questions with lettered options and an <b>Answer:</b> line. Markdown
              headings and <b>---</b> dividers are ignored, so you can paste a whole paper.
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-xs text-ink">
              {ANSWER_KEY_EXAMPLE}
            </pre>
          </div>

          <div>
            <p className="font-medium text-ink">Starred style</p>
            <p className="mt-1 text-xs">
              A blank line between questions. First line is the question, the rest are options, and
              a <b>*</b> marks the correct one.
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-white p-3 text-xs text-ink">
              {STARRED_EXAMPLE}
            </pre>
          </div>
        </div>
      </div>

      <textarea
        name="questions"
        rows={12}
        required
        placeholder="Paste your questions here…"
        className={`${inputClass} font-mono text-sm`}
      />

      {message ? (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Adding…" : "Add questions"}
        </button>
      </div>
    </form>
  );
}
