import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card } from "@/components/ui";
import { ExamCreateForm } from "@/components/exam-create-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Exam, Group } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-off-white text-muted",
  PUBLISHED: "bg-success-light text-success",
  CLOSED: "bg-danger-light text-danger",
};

export default async function ExamsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [examsData, groupsData, questionsData, attemptsData, violationsData] = await Promise.all([
    supabaseAdmin.from("exams").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
    supabaseAdmin.from("exam_questions").select("exam_id"),
    supabaseAdmin.from("exam_attempts").select("exam_id, status"),
    supabaseAdmin.from("exam_violations").select("exam_id").eq("acknowledged", false),
  ]);

  const exams = (examsData.data || []) as Exam[];
  const groups = (groupsData.data || []) as Group[];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const countBy = <T extends { exam_id: string }>(rows: T[] | null, filter?: (row: T) => boolean) => {
    const counts = new Map<string, number>();
    for (const row of rows || []) {
      if (filter && !filter(row)) continue;
      counts.set(row.exam_id, (counts.get(row.exam_id) ?? 0) + 1);
    }
    return counts;
  };

  const questionCounts = countBy(questionsData.data as { exam_id: string }[]);
  const attemptRows = (attemptsData.data || []) as { exam_id: string; status: string }[];
  const attemptCounts = countBy(attemptRows);
  const terminatedCounts = countBy(attemptRows, (row) => row.status === "TERMINATED");
  const violationCounts = countBy(violationsData.data as { exam_id: string }[]);

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Exams"
      subtitle="Create an exam, add the questions, publish it, and watch students sit it live."
    >
      {exams.length ? (
        <Card className="mb-6">
          <h2 className="font-display mb-4 text-2xl">All exams</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2">Exam</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Group</th>
                  <th className="pb-2">Questions</th>
                  <th className="pb-2">Attempts</th>
                  <th className="pb-2">Terminated</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => {
                  const alerts = violationCounts.get(exam.id) ?? 0;
                  return (
                    <tr key={exam.id} className="border-t border-line">
                      <td className="py-3">
                        <p className="font-medium">{exam.title}</p>
                        <p className="text-xs text-muted">
                          {exam.duration_minutes} min · +{exam.marks_correct} / −{exam.marks_wrong}
                        </p>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-medium ${STATUS_STYLE[exam.status]}`}
                        >
                          {exam.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {exam.group_id ? groupName.get(exam.group_id) || "—" : "All students"}
                      </td>
                      <td className="py-3">{questionCounts.get(exam.id) ?? 0}</td>
                      <td className="py-3">{attemptCounts.get(exam.id) ?? 0}</td>
                      <td className="py-3">
                        {terminatedCounts.get(exam.id) ?? 0}
                        {alerts ? (
                          <span className="ml-2 rounded-md bg-danger px-1.5 py-0.5 text-xs font-medium text-white">
                            {alerts} new
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/exams/${exam.id}/monitor`}
                          className="ml-4 font-medium text-primary hover:underline"
                        >
                          Monitor
                        </Link>
                        <Link
                          href={`/admin/exams/${exam.id}/results`}
                          className="ml-4 font-medium text-primary hover:underline"
                        >
                          Results
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-display mb-4 text-2xl">New exam</h2>
        <ExamCreateForm groups={groups} />
      </Card>
    </Shell>
  );
}
