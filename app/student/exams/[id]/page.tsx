import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/auth";
import { Shell, Card } from "@/components/ui";
import { ExamStart } from "@/components/exam-start";
import { ExamWindow } from "@/components/exam-window";
import { gradeAttempt, sanitizeAnswers, toPaperQuestions, buildAnswerReview, violationLabel } from "@/lib/exam";
import { ExamAnswerReview } from "@/components/exam-answer-review";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, ExamQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * If a student closes the browser after time is up, the attempt can sit as
 * IN_PROGRESS forever. Lock it here before rendering so they cannot reopen
 * and keep writing.
 */
async function lockIfExpired(attempt: ExamAttempt, exam: Exam) {
  if (attempt.status !== "IN_PROGRESS") return attempt;
  if (new Date(attempt.ends_at).getTime() > Date.now()) return attempt;

  const { data: questionRows } = await supabaseAdmin
    .from("exam_questions")
    .select("*")
    .eq("exam_id", attempt.exam_id);

  const questions = (questionRows || []) as ExamQuestion[];
  const answers = sanitizeAnswers(questions, attempt.answers ?? {});
  const result = gradeAttempt(
    questions,
    answers,
    Number(exam.marks_correct),
    Number(exam.marks_wrong),
  );

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("exam_attempts")
    .update({
      answers,
      status: "SUBMITTED",
      submitted_at: now,
      termination_reason: "TIME_UP",
      score: result.score,
      correct_count: result.correct,
      wrong_count: result.wrong,
      unanswered_count: result.unanswered,
    })
    .eq("id", attempt.id)
    .eq("status", "IN_PROGRESS");

  const { data } = await supabaseAdmin
    .from("exam_attempts")
    .select("*")
    .eq("id", attempt.id)
    .single();

  return (data as ExamAttempt) ?? { ...attempt, status: "SUBMITTED" as const };
}

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

  let attempt = attemptData.data as ExamAttempt | null;
  if (attempt) attempt = await lockIfExpired(attempt, exam);

  if (exam.group_id && exam.group_id !== session.groupId) {
    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card>
          <p className="text-muted">This exam is set for a different group.</p>
        </Card>
      </Shell>
    );
  }

  if (session.subscription !== "ACTIVE") {
    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card>
          <p className="text-muted">
            Your account is not active, so you cannot sit this exam. Speak to your invigilator.
          </p>
        </Card>
      </Shell>
    );
  }

  // Finished, one way or the other. Marks and the answer key stay hidden until
  // the admin closes the exam, so nobody can share answers while others write.
  if (attempt && attempt.status !== "IN_PROGRESS") {
    const terminated = attempt.status === "TERMINATED";
    const revealed = exam.status === "CLOSED";
    const timedOut = attempt.termination_reason === "TIME_UP" && !terminated;

    let review = null;
    if (revealed) {
      const { data: reviewRows } = await supabaseAdmin
        .from("exam_questions")
        .select("*")
        .eq("exam_id", id);
      const reviewQuestions = (reviewRows || []) as ExamQuestion[];
      const cleanAnswers = sanitizeAnswers(reviewQuestions, attempt.answers ?? {});
      review = buildAnswerReview(reviewQuestions, cleanAnswers, attempt.question_order);
    }

    return (
      <Shell role="STUDENT" name={session.name} title={exam.title}>
        <Card className={terminated ? "border-danger" : "border-success"}>
          <h2 className={`font-display text-2xl ${terminated ? "text-danger" : "text-success"}`}>
            {terminated ? "Exam terminated" : timedOut ? "Time is up" : "Exam submitted"}
          </h2>

          <p className="mt-2 text-muted">
            {terminated
              ? `Your exam was ended because you left the window: ${violationLabel(
                  attempt.termination_reason ?? "",
                ).toLowerCase()}. Your invigilator has been notified.`
              : timedOut
                ? "The timer ended and your answers were submitted automatically."
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
              Your marks and the answer review will appear here once the exam is closed for
              everyone.
            </p>
          )}

          <Link
            href="/student/exams"
            className="mt-6 inline-flex rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-off-white"
          >
            Back to exams
          </Link>
        </Card>

        {revealed && review ? (
          <Card className="mt-6">
            <h2 className="font-display mb-2 text-2xl">Answer review</h2>
            <p className="mb-4 text-sm text-muted">
              Green = correct. Red = your wrong choice. The correct option is marked on every
              question.
            </p>
            <ExamAnswerReview items={review} />
          </Card>
        ) : null}
      </Shell>
    );
  }

  // For the live paper we never select correct_index — only text and options.
  const { data: questionRows } = await supabaseAdmin
    .from("exam_questions")
    .select("id, exam_id, position, text, options, created_at")
    .eq("exam_id", id)
    .order("position", { ascending: true });

  const questions = ((questionRows || []) as Omit<ExamQuestion, "correct_index">[]).map((q) => ({
    ...q,
    correct_index: -1,
  })) as ExamQuestion[];

  if (attempt) {
    const paper = toPaperQuestions(questions, attempt.question_order, attempt.option_orders);
    const safeAnswers = Object.fromEntries(
      Object.entries(attempt.answers ?? {}).filter(([id, value]) => {
        const question = questions.find((q) => q.id === id);
        return question && Number.isInteger(value) && value >= 0 && value < question.options.length;
      }),
    ) as Record<string, number>;

    return (
      <ExamWindow
        attemptId={attempt.id}
        title={exam.title}
        instructions={exam.instructions}
        questions={paper}
        initialAnswers={safeAnswers}
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
