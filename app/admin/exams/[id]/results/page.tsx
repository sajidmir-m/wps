import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, btnGhost, btnPrimary } from "@/components/ui";
import { buildExamResults, PASS_PERCENT } from "@/lib/exam";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExamResultsPage({
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

  const [studentsData, attemptsData, groupsData, questionsData] = await Promise.all([
    studentsQuery,
    supabaseAdmin.from("exam_attempts").select("*").eq("exam_id", id),
    supabaseAdmin.from("groups").select("id, name"),
    supabaseAdmin.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", id),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const attempts = (attemptsData.data || []) as ExamAttempt[];
  const groups = (groupsData.data || []) as Group[];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const questionCount = questionsData.count ?? 0;
  const totalMarks = questionCount * Number(exam.marks_correct);

  const { rows, summary } = buildExamResults(students, attempts, totalMarks);
  const passMark = Math.round(totalMarks * (PASS_PERCENT / 100) * 100) / 100;

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title={`Results · ${exam.title}`}
      subtitle={`${questionCount} questions · total ${totalMarks} marks · pass mark ${passMark} (${PASS_PERCENT}%)`}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/admin/exams/${exam.id}`} className={btnGhost}>
          Back to exam
        </Link>
        <Link href={`/admin/exams/${exam.id}/monitor`} className={btnGhost}>
          Live monitor
        </Link>
        <Link href={`/admin/exams/${exam.id}/results/print`} className={btnPrimary}>
          Export PDF
        </Link>
      </div>

      {exam.status !== "CLOSED" ? (
        <Card className="mb-6 border-warning">
          <p className="text-sm">
            This exam is still <b>{exam.status.toLowerCase()}</b>. Students cannot see their marks
            until you close it, and these results will keep changing while people are writing.
          </p>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Appeared", value: `${summary.appeared}/${summary.total}` },
          { label: "Passed", value: String(summary.passed) },
          { label: "Failed", value: String(summary.failed) },
          { label: "Class average", value: summary.appeared ? `${summary.average}%` : "—" },
          { label: "Highest", value: summary.appeared ? `${summary.highest}` : "—" },
        ].map((box) => (
          <Card key={box.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{box.label}</p>
            <p className="font-display mt-2 text-3xl">{box.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display mb-4 text-2xl">Merit list</h2>

        {summary.appeared ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Group</th>
                  <th className="pb-2 text-right">Correct</th>
                  <th className="pb-2 text-right">Wrong</th>
                  <th className="pb-2 text-right">Blank</th>
                  <th className="pb-2 text-right">Score</th>
                  <th className="pb-2 text-right">%</th>
                  <th className="pb-2">Result</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, attempt, appeared, score, percent, passed, rank }) => (
                  <tr key={student.id} className="border-t border-line">
                    <td className="py-3 font-medium">{rank ?? "—"}</td>
                    <td className="py-3">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted">{student.email}</p>
                    </td>
                    <td className="py-3">
                      {student.group_id ? groupName.get(student.group_id) || "—" : "—"}
                    </td>
                    <td className="py-3 text-right">{attempt?.correct_count ?? "—"}</td>
                    <td className="py-3 text-right">{attempt?.wrong_count ?? "—"}</td>
                    <td className="py-3 text-right">{attempt?.unanswered_count ?? "—"}</td>
                    <td className="py-3 text-right font-medium">
                      {appeared ? `${score} / ${totalMarks}` : "—"}
                    </td>
                    <td className="py-3 text-right">{percent === null ? "—" : `${percent}%`}</td>
                    <td className="py-3">
                      {!appeared ? (
                        <span className="rounded-lg bg-off-white px-2 py-1 text-xs font-medium text-muted">
                          Did not appear
                        </span>
                      ) : attempt?.status === "TERMINATED" ? (
                        <span className="rounded-lg bg-danger-light px-2 py-1 text-xs font-medium text-danger">
                          Terminated
                        </span>
                      ) : passed ? (
                        <span className="rounded-lg bg-success-light px-2 py-1 text-xs font-medium text-success">
                          Pass
                        </span>
                      ) : (
                        <span className="rounded-lg bg-danger-light px-2 py-1 text-xs font-medium text-danger">
                          Fail
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {appeared ? (
                        <Link
                          href={`/admin/exams/${exam.id}/results/${student.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View answers
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Nobody has finished this exam yet, so there are no results to rank.
          </p>
        )}
      </Card>
    </Shell>
  );
}
