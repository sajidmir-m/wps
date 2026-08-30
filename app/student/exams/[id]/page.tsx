import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/auth";
import { Shell, Card } from "@/components/ui";
import { ExamStart } from "@/components/exam-start";
import { ExamWindow } from "@/components/exam-window";
import { toPaperQuestions, violationLabel } from "@/lib/exam";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, ExamQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin");

  const { id } = await params;

  const [examData, attemptData] = await Promise.all([
    supabaseAdmin.from("exams").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", id)
      .eq("student_id", session.id)
      .maybeSingle(),
  ]);

  const exam = examData.data as Exam | null;
  if (!exam) notFound();

  const attempt = attemptData.data as ExamAttempt | null;

  if (exam.group_id && exam.group_id !== session.groupId) {
    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card>
          <p className="text-muted">This exam is set for a different group.</p>
        </Card>
      </Shell>
    );
  }

  // Finished, one way or the other. Marks stay hidden until the admin closes
  // the exam, so students cannot compare answers while others are still writing.
  if (attempt && attempt.status !== "IN_PROGRESS") {
    const terminated = attempt.status === "TERMINATED";
    const revealed = exam.status === "CLOSED";

    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card className={terminated ? "border-danger" : "border-success"}>
          <h2 className={`font-display text-2xl ${terminated ? "text-danger" : "text-success"}`}>
            {terminated ? "Exam terminated" : "Exam submitted"}
          </h2>

          <p className="mt-2 text-muted">
            {terminated
              ? `Your exam was ended because you left the window: ${violationLabel(
                  attempt.termination_reason ?? "",
                ).toLowerCase()}. Your invigilator has been notified.`
              : "Your answers have been recorded. Thank you."}
          </p>

          <p className="mt-2 text-muted">You cannot take this exam again.</p>

          {revealed ? (
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
          ) : (
            <p className="mt-4 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
              Your marks will appear here once the exam is closed for everyone.
            </p>
          )}

          <Link
            href="/student/exams"
            className="mt-6 inline-flex rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-off-white"
          >
            Back to exams
          </Link>
        </Card>
      </Shell>
    );
  }

  const { data: questionRows } = await supabaseAdmin
    .from("exam_questions")
    .select("*")
    .eq("exam_id", id);
  const questions = (questionRows || []) as ExamQuestion[];

  if (attempt) {
    // Correct answers are stripped here; the browser never receives them.
    const paper = toPaperQuestions(questions, attempt.question_order, attempt.option_orders);

    return (
      <ExamWindow
        attemptId={attempt.id}
        title={exam.title}
        instructions={exam.instructions}
        questions={paper}
        initialAnswers={attempt.answers ?? {}}
        endsAt={attempt.ends_at}
        marksCorrect={Number(exam.marks_correct)}
        marksWrong={Number(exam.marks_wrong)}
      />
    );
  }

  if (exam.status !== "PUBLISHED") {
    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card>
          <p className="text-muted">This exam is not open right now.</p>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell
      role="STUDENT"
      name={session.name}
      title={exam.title}
      subtitle="Read every rule before you start. The timer begins immediately."
    >
      <Card>
        {exam.instructions ? (
          <p className="mb-5 rounded-xl bg-off-white px-4 py-3 text-sm">{exam.instructions}</p>
        ) : null}
        <ExamStart
          examId={exam.id}
          durationMinutes={exam.duration_minutes}
          questionCount={questions.length}
          marksCorrect={Number(exam.marks_correct)}
          marksWrong={Number(exam.marks_wrong)}
        />
      </Card>
    </Shell>
  );
}
