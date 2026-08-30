import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, btnPrimary, btnGhost, btnDanger } from "@/components/ui";
import { ExamQuestionsForm } from "@/components/exam-questions-form";
import { ExamSettingsForm } from "@/components/exam-settings-form";
import { ActionButton } from "@/components/action-button";
import {
  setExamStatusAction,
  deleteExamAction,
  deleteQuestionAction,
} from "@/app/actions/exam";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamQuestion, Group } from "@/lib/types";

export default async function ExamEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { id } = await params;

  const [examData, questionsData, groupsData, attemptsData] = await Promise.all([
    supabaseAdmin.from("exams").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("exam_questions")
      .select("*")
      .eq("exam_id", id)
      .order("position", { ascending: true }),
    supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
    supabaseAdmin.from("exam_attempts").select("id", { count: "exact", head: true }).eq("exam_id", id),
  ]);

  const exam = examData.data as Exam | null;
  if (!exam) notFound();

  const questions = (questionsData.data || []) as ExamQuestion[];
  const groups = (groupsData.data || []) as Group[];
  const attemptCount = attemptsData.count ?? 0;

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title={exam.title}
      subtitle={`${exam.status} · ${questions.length} questions · ${attemptCount} attempts`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/exams" className={btnGhost}>
          All exams
        </Link>
        <Link href={`/admin/exams/${exam.id}/monitor`} className={btnGhost}>
          Live monitor
        </Link>
        <Link href={`/admin/exams/${exam.id}/results`} className={btnGhost}>
          Results
        </Link>

        {exam.status !== "PUBLISHED" ? (
          <ActionButton
            action={setExamStatusAction}
            fields={{ id: exam.id, status: "PUBLISHED" }}
            className={btnPrimary}
            pendingLabel="Publishing…"
          >
            Publish to students
          </ActionButton>
        ) : (
          <ActionButton
            action={setExamStatusAction}
            fields={{ id: exam.id, status: "CLOSED" }}
            className={btnDanger}
            pendingLabel="Closing…"
            confirm="Close this exam? Students who have not started will no longer be able to."
          >
            Close exam
          </ActionButton>
        )}

        <span className="ml-auto">
          <ActionButton
            action={deleteExamAction}
            fields={{ id: exam.id }}
            className={btnGhost}
            pendingLabel="Deleting…"
            confirm="Delete this exam along with all its questions and results? This cannot be undone."
          >
            Delete exam
          </ActionButton>
        </span>
      </div>

      {exam.status === "PUBLISHED" ? (
        <Card className="mb-6 border-success">
          <p className="text-sm">
            <b className="text-success">This exam is open.</b> Students in{" "}
            {exam.group_id ? "the selected group" : "every group"} can sit it once. Editing
            questions now will not change papers already in progress.
          </p>
        </Card>
      ) : null}

      <Card className="mb-6">
        <h2 className="font-display mb-4 text-2xl">Settings</h2>
        <ExamSettingsForm exam={exam} groups={groups} />
      </Card>

      <Card className="mb-6">
        <h2 className="font-display mb-4 text-2xl">Add questions</h2>
        <ExamQuestionsForm examId={exam.id} />
      </Card>

      <Card>
        <h2 className="font-display mb-4 text-2xl">Question paper ({questions.length})</h2>
        {questions.length ? (
          <ol className="space-y-4">
            {questions.map((question, index) => (
              <li key={question.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">
                    {index + 1}. {question.text}
                  </p>
                  <ActionButton
                    action={deleteQuestionAction}
                    fields={{ id: question.id }}
                    className="shrink-0 text-sm font-medium text-danger hover:underline"
                    pendingLabel="Removing…"
                  >
                    Remove
                  </ActionButton>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={
                        optionIndex === question.correct_index
                          ? "font-medium text-success"
                          : "text-muted"
                      }
                    >
                      {String.fromCharCode(65 + optionIndex)}. {option}
                      {optionIndex === question.correct_index ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">
            No questions yet. Paste them in the box above to build the paper.
          </p>
        )}
      </Card>
    </Shell>
  );
}
