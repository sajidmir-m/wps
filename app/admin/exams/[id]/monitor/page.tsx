import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, btnGhost } from "@/components/ui";
import { ExamMonitorLive } from "@/components/exam-monitor-live";
import { ActionButton } from "@/components/action-button";
import { resetAttemptAction, acknowledgeViolationsAction } from "@/app/actions/exam";
import { violationLabel } from "@/lib/exam";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, ExamViolation, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: "bg-off-white text-muted",
  IN_PROGRESS: "bg-primary-light text-primary-dark",
  SUBMITTED: "bg-success-light text-success",
  TERMINATED: "bg-danger-light text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "Writing now",
  SUBMITTED: "Submitted",
  TERMINATED: "Terminated",
};

function timeOf(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default async function ExamMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { id } = await params;

  const { data: examData } = await supabaseAdmin.from("exams").select("*").eq("id", id).maybeSingle();
  const exam = examData as Exam | null;
  if (!exam) notFound();

  let studentsQuery = supabaseAdmin
    .from("profiles")
    .select("id, name, email, group_id")
    .eq("role", "STUDENT")
    .order("name", { ascending: true });
  if (exam.group_id) studentsQuery = studentsQuery.eq("group_id", exam.group_id);

  const [studentsData, attemptsData, violationsData, questionsData] = await Promise.all([
    studentsQuery,
    supabaseAdmin.from("exam_attempts").select("*").eq("exam_id", id),
    supabaseAdmin
      .from("exam_violations")
      .select("*")
      .eq("exam_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", id),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const attempts = (attemptsData.data || []) as ExamAttempt[];
  const violations = (violationsData.data || []) as ExamViolation[];
  const questionCount = questionsData.count ?? 0;

  const attemptByStudent = new Map(attempts.map((a) => [a.student_id, a]));
  const studentName = new Map(students.map((s) => [s.id, s.name]));
  const violationsByStudent = new Map<string, number>();
  for (const violation of violations) {
    violationsByStudent.set(
      violation.student_id,
      (violationsByStudent.get(violation.student_id) ?? 0) + 1,
    );
  }

  const rows = students.map((student) => {
    const attempt = attemptByStudent.get(student.id) ?? null;
    return {
      student,
      attempt,
      status: attempt?.status ?? "NOT_STARTED",
      violations: violationsByStudent.get(student.id) ?? 0,
    };
  });

  const writing = rows.filter((r) => r.status === "IN_PROGRESS").length;
  const submitted = rows.filter((r) => r.status === "SUBMITTED").length;
  const terminated = rows.filter((r) => r.status === "TERMINATED").length;
  const totalMarks = questionCount * Number(exam.marks_correct);

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title={`Monitor · ${exam.title}`}
      subtitle={`${questionCount} questions · ${exam.duration_minutes} min · total ${totalMarks} marks`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/admin/exams/${exam.id}`} className={btnGhost}>
          Back to exam
        </Link>
        <Link href={`/admin/exams/${exam.id}/results`} className={btnGhost}>
          Results
        </Link>
        <ExamMonitorLive violationCount={violations.length} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Students", value: students.length },
          { label: "Writing now", value: writing },
          { label: "Submitted", value: submitted },
          { label: "Terminated", value: terminated },
        ].map((box) => (
          <Card key={box.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{box.label}</p>
            <p className="font-display mt-2 text-4xl">{box.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h2 className="font-display mb-4 text-2xl">Students</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-2">Student</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Started</th>
                <th className="pb-2">Finished</th>
                <th className="pb-2">Score</th>
                <th className="pb-2">C / W / Blank</th>
                <th className="pb-2">Alerts</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, attempt, status, violations: count }) => (
                <tr key={student.id} className="border-t border-line">
                  <td className="py-3">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted">{student.email}</p>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="py-3 text-muted">{timeOf(attempt?.started_at ?? null)}</td>
                  <td className="py-3 text-muted">
                    {timeOf(attempt?.submitted_at ?? attempt?.terminated_at ?? null)}
                  </td>
                  <td className="py-3 font-medium">
                    {attempt?.score === null || attempt?.score === undefined
                      ? "—"
                      : `${attempt.score} / ${totalMarks}`}
                  </td>
                  <td className="py-3 text-muted">
                    {attempt && attempt.correct_count !== null
                      ? `${attempt.correct_count} / ${attempt.wrong_count} / ${attempt.unanswered_count}`
                      : "—"}
                  </td>
                  <td className="py-3">
                    {count ? (
                      <span className="rounded-md bg-danger px-2 py-0.5 text-xs font-medium text-white">
                        {count}
                      </span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {attempt ? (
                      <ActionButton
                        action={resetAttemptAction}
                        fields={{ attemptId: attempt.id }}
                        className="text-sm font-medium text-primary hover:underline"
                        pendingLabel="Clearing…"
                        confirm={`Clear ${student.name}'s attempt so they can sit this exam again?`}
                      >
                        Allow retake
                      </ActionButton>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="text-sm text-muted">No students match this exam&rsquo;s group.</p>
        ) : null}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Alerts</h2>
          {violations.length ? (
            <ActionButton
              action={acknowledgeViolationsAction}
              fields={{ examId: exam.id }}
              className={btnGhost}
              pendingLabel="Clearing…"
            >
              Mark all as seen
            </ActionButton>
          ) : null}
        </div>

        {violations.length ? (
          <ul className="space-y-2">
            {violations.map((violation) => (
              <li
                key={violation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {studentName.get(violation.student_id) ?? "Unknown student"}
                  </p>
                  <p className="text-muted">{violationLabel(violation.kind)}</p>
                </div>
                <span className="text-muted">
                  {new Date(violation.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No alerts. If a student leaves the exam window, it will appear here straight away.
          </p>
        )}
      </Card>
    </Shell>
  );
}
