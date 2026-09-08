import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/auth";
import { Shell, Card } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt } from "@/lib/types";

export default async function StudentExamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin");

  const [examsData, attemptsData] = await Promise.all([
    supabaseAdmin
      .from("exams")
      .select("*")
      .in("status", ["PUBLISHED", "CLOSED"])
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("exam_attempts").select("*").eq("student_id", session.id),
  ]);

  const allExams = (examsData.data || []) as Exam[];
  const attempts = (attemptsData.data || []) as ExamAttempt[];
  const attemptByExam = new Map(attempts.map((a) => [a.exam_id, a]));

  // Open exams for this group, plus any closed exam this student already sat.
  const exams = allExams.filter((exam) => {
    const inGroup = !exam.group_id || exam.group_id === session.groupId;
    if (!inGroup) return false;
    if (exam.status === "PUBLISHED") return true;
    return attemptByExam.has(exam.id);
  });

  return (
    <Shell
      role="STUDENT"
      name={session.name}
      title="Exams"
      subtitle="Each exam can be taken once. After it is closed you can review every answer."
    >
      {exams.length ? (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const attempt = attemptByExam.get(exam.id);
            const done = attempt && attempt.status !== "IN_PROGRESS";
            const closed = exam.status === "CLOSED";

            return (
              <Card key={exam.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl">{exam.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {exam.duration_minutes} minutes · +{exam.marks_correct} per correct · −
                      {exam.marks_wrong} per wrong
                      {closed ? " · closed" : ""}
                    </p>
                  </div>

                  {done ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                          attempt.status === "TERMINATED"
                            ? "bg-danger-light text-danger"
                            : "bg-success-light text-success"
                        }`}
                      >
                        {attempt.status === "TERMINATED" ? "Terminated" : "Submitted"}
                      </span>
                      <Link
                        href={`/student/exams/${exam.id}`}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                      >
                        {closed ? "View answers" : "View status"}
                      </Link>
                    </div>
                  ) : closed ? (
                    <span className="rounded-lg bg-off-white px-3 py-1.5 text-sm font-medium text-muted">
                      Closed
                    </span>
                  ) : (
                    <Link
                      href={`/student/exams/${exam.id}`}
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
                    >
                      {attempt ? "Continue exam" : "Start exam"}
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-muted">No exam is open for you right now.</p>
        </Card>
      )}
    </Shell>
  );
}
