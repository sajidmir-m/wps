import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, btnGhost } from "@/components/ui";
import { buildAnswerReview, sanitizeAnswers, violationLabel } from "@/lib/exam";
import { ExamAnswerReview } from "@/components/exam-answer-review";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, ExamQuestion, Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStudentAnswerSheetPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { id, studentId } = await params;

  const [examData, studentData, attemptData, questionsData, groupsData] = await Promise.all([
    supabaseAdmin.from("exams").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("id, name, email, group_id, role")
      .eq("id", studentId)
      .maybeSingle(),
    supabaseAdmin
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", id)
      .eq("student_id", studentId)
      .maybeSingle(),
    supabaseAdmin.from("exam_questions").select("*").eq("exam_id", id),
    supabaseAdmin.from("groups").select("id, name"),
  ]);

  const exam = examData.data as Exam | null;
  const student = studentData.data as Profile | null;
  if (!exam || !student || student.role !== "STUDENT") notFound();

  const attempt = attemptData.data as ExamAttempt | null;
  const questions = (questionsData.data || []) as ExamQuestion[];
  const groups = (groupsData.data || []) as Group[];
  const groupLabel = student.group_id
    ? groups.find((g) => g.id === student.group_id)?.name || "—"
    : "—";

  const finished = attempt && attempt.status !== "IN_PROGRESS";
  const review =
    finished && attempt
      ? buildAnswerReview(
          questions,
          sanitizeAnswers(questions, attempt.answers ?? {}),
          attempt.question_order,
        )
      : [];

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title={`${student.name} · answer sheet`}
      subtitle={`${exam.title} · ${groupLabel} · ${student.email}`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/admin/exams/${exam.id}/results`} className={btnGhost}>
          Back to results
        </Link>
        <Link href={`/admin/exams/${exam.id}/certificates/print#${student.id}`} className={btnGhost}>
          Certificate
        </Link>
        <Link href={`/admin/exams/${exam.id}/monitor`} className={btnGhost}>
          Live monitor
        </Link>
      </div>

      {!attempt ? (
        <Card>
          <p className="text-muted">This student did not start the exam.</p>
        </Card>
      ) : !finished ? (
        <Card className="border-warning">
          <p className="text-sm">
            {student.name} is still writing. The full answer sheet will be available when they
            submit or the timer ends.
          </p>
        </Card>
      ) : (
        <>
          <Card
            className={
              attempt.status === "TERMINATED" ? "mb-6 border-danger" : "mb-6 border-success"
            }
          >
            <h2 className="font-display text-2xl">
              {attempt.status === "TERMINATED" ? "Terminated" : "Submitted"}
            </h2>
            {attempt.termination_reason ? (
              <p className="mt-2 text-sm text-muted">
                Reason: {violationLabel(attempt.termination_reason)}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Score", value: String(attempt.score ?? 0) },
                { label: "Correct", value: String(attempt.correct_count ?? 0) },
                { label: "Wrong", value: String(attempt.wrong_count ?? 0) },
                { label: "Blank", value: String(attempt.unanswered_count ?? 0) },
              ].map((box) => (
                <div key={box.label} className="rounded-xl border border-line px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{box.label}</p>
                  <p className="font-display mt-1 text-2xl">{box.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-display mb-2 text-2xl">Answer review</h2>
            <p className="mb-4 text-sm text-muted">
              Green = correct. Red = {student.name}&apos;s wrong choice. The correct option is
              marked on every question.
            </p>
            <ExamAnswerReview
              items={review}
              chosenLabel={`${student.name}'s answer`}
              blankLabel={`${student.name} left this blank.`}
            />
          </Card>
        </>
      )}
    </Shell>
  );
}
