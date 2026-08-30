import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { todayISO, formatDisplayDate } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { violationLabel, PASS_PERCENT } from "@/lib/exam";
import { Card, Shell, Stat } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { AttendanceRecord } from "@/lib/types";

export default async function AdminHome() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const today = todayISO();

  const [studentsData, groupsData, lessonsData, commentsData, allAttendanceData] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, group_id").eq("role", "STUDENT").order("name", { ascending: true }),
      supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
      supabaseAdmin
        .from("lessons")
        .select("id, date, topic, method, groups(name)")
        .order("date", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("comments")
        .select("id, body, profiles(name)")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin.from("attendance").select("student_id, date, status"),
    ]);

  const { data: alertRows } = await supabaseAdmin
    .from("exam_violations")
    .select("id, exam_id, student_id, kind, created_at, exams(title), profiles(name)")
    .eq("acknowledged", false)
    .order("created_at", { ascending: false })
    .limit(8);

  const alerts = (alertRows || []) as {
    id: string;
    exam_id: string;
    kind: string;
    created_at: string;
    exams: { title: string } | { title: string }[] | null;
    profiles: { name: string } | { name: string }[] | null;
  }[];

  const [examsRes, examAttemptsRes, examQuestionsRes] = await Promise.all([
    supabaseAdmin
      .from("exams")
      .select("id, title, status, marks_correct")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin.from("exam_attempts").select("exam_id, status, score"),
    supabaseAdmin.from("exam_questions").select("exam_id"),
  ]);

  const questionsPerExam = new Map<string, number>();
  for (const row of (examQuestionsRes.data || []) as { exam_id: string }[]) {
    questionsPerExam.set(row.exam_id, (questionsPerExam.get(row.exam_id) ?? 0) + 1);
  }

  const examAttempts = (examAttemptsRes.data || []) as {
    exam_id: string;
    status: string;
    score: number | null;
  }[];

  const examSummaries = (
    (examsRes.data || []) as {
      id: string;
      title: string;
      status: string;
      marks_correct: number;
    }[]
  ).map((exam) => {
    const totalMarks = (questionsPerExam.get(exam.id) ?? 0) * Number(exam.marks_correct);
    const finished = examAttempts.filter(
      (a) => a.exam_id === exam.id && a.status !== "IN_PROGRESS",
    );
    const percents = finished.map((a) =>
      totalMarks > 0 ? (Number(a.score ?? 0) / totalMarks) * 100 : 0,
    );

    return {
      ...exam,
      totalMarks,
      appeared: finished.length,
      passed: percents.filter((p) => p >= PASS_PERCENT).length,
      average: percents.length
        ? Math.round((percents.reduce((sum, p) => sum + p, 0) / percents.length) * 10) / 10
        : 0,
    };
  });

  const students = (studentsData.data || []) as { id: string; name: string; group_id: string | null }[];
  const groups = (groupsData.data || []) as { id: string; name: string }[];
  const lessons = (lessonsData.data || []) as {
    id: string;
    date: string;
    topic: string;
    method: string;
    groups: { name: string } | { name: string }[] | null;
  }[];
  const comments = (commentsData.data || []) as {
    id: string;
    body: string;
    profiles: { name: string } | { name: string }[] | null;
  }[];
  const allAttendance = (allAttendanceData.data || []) as AttendanceRecord[];
  const attendance = allAttendance.filter((a) => a.date === today);

  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const record of allAttendance) {
    const list = byStudent.get(record.student_id);
    if (list) list.push(record);
    else byStudent.set(record.student_id, [record]);
  }

  const stats = students.map((s) => computeStats(byStudent.get(s.id) || []));
  const withMarks = stats.filter((s) => s.marked > 0);
  const avg =
    withMarks.length === 0
      ? 0
      : Math.round((withMarks.reduce((sum, s) => sum + s.percent, 0) / withMarks.length) * 10) / 10;
  const neverAbsent = stats.filter((s) => s.continuous && s.marked > 0).length;
  const todayPresent = attendance.filter((a) => a.status !== "ABSENT").length;

  function relationName(value: { name: string } | { name: string }[] | null) {
    if (!value) return null;
    return Array.isArray(value) ? value[0]?.name ?? null : value.name;
  }

  function relationTitle(value: { title: string } | { title: string }[] | null) {
    if (!value) return null;
    return Array.isArray(value) ? value[0]?.title ?? null : value.title;
  }

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Admin dashboard"
      subtitle="Womans Polytechnic College Srinagar"
    >
      {alerts.length ? (
        <Card className="mb-6 border-danger bg-danger-light">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-danger">
              {alerts.length} exam alert{alerts.length === 1 ? "" : "s"}
            </h2>
            <Link
              href={`/admin/exams/${alerts[0].exam_id}/monitor`}
              className="rounded-xl bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Open live monitor
            </Link>
          </div>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                <b>{relationName(alert.profiles) ?? "A student"}</b>{" "}
                {violationLabel(alert.kind).toLowerCase()} during{" "}
                <b>{relationTitle(alert.exams) ?? "an exam"}</b>
                <span className="ml-2 text-muted">
                  {new Date(alert.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Students" value={students.length} hint={`${groups.length} groups`} />
        <Stat
          label="Present today"
          value={attendance.length ? todayPresent : "—"}
          hint={formatDisplayDate(today)}
        />
        <Stat
          label="Average attendance"
          value={withMarks.length ? `${avg}%` : "—"}
          hint="Across all marked days"
        />
        <Stat label="Never absent" value={neverAbsent} hint="No absence so far" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Groups</h2>
            <Link href="/admin/students" className="text-sm text-primary font-medium">
              Manage students
            </Link>
          </div>
          <ul className="space-y-2">
            {groups.map((g) => {
              const count = students.filter((s) => s.group_id === g.id).length;
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-xl bg-off-white px-3 py-2"
                >
                  <span>{g.name}</span>
                  <span className="text-sm text-muted">{count} students</span>
                </li>
              );
            })}
            {!groups.length ? <p className="text-sm text-muted">No groups yet.</p> : null}
          </ul>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Latest lessons</h2>
            <Link href="/admin/lessons" className="text-sm text-primary font-medium">
              Add lesson
            </Link>
          </div>
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id}>
                <p className="font-medium">{l.topic}</p>
                <p className="text-sm text-muted">
                  {l.date} · {l.method}
                  {relationName(l.groups) ? ` · ${relationName(l.groups)}` : " · All groups"}
                </p>
              </li>
            ))}
            {!lessons.length ? (
              <p className="text-sm text-muted">No lessons logged yet.</p>
            ) : null}
          </ul>
        </Card>
      </div>

      {examSummaries.length ? (
        <Card className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Exam results</h2>
            <Link href="/admin/exams" className="text-sm text-primary font-medium">
              All exams
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2">Exam</th>
                  <th className="pb-2 text-right">Appeared</th>
                  <th className="pb-2 text-right">Passed</th>
                  <th className="pb-2 text-right">Average</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {examSummaries.map((exam) => (
                  <tr key={exam.id} className="border-t border-line">
                    <td className="py-3">
                      <p className="font-medium">{exam.title}</p>
                      <p className="text-xs text-muted">
                        {exam.status.toLowerCase()} · {exam.totalMarks} marks
                      </p>
                    </td>
                    <td className="py-3 text-right">{exam.appeared}</td>
                    <td className="py-3 text-right">
                      {exam.appeared ? `${exam.passed}/${exam.appeared}` : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {exam.appeared ? `${exam.average}%` : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/exams/${exam.id}/results`}
                        className="font-medium text-primary hover:underline"
                      >
                        Results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recent questions</h2>
          <Link href="/admin/comments" className="text-sm text-primary font-medium">
            Open inbox
          </Link>
        </div>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-off-white px-3 py-2">
              <p className="text-sm">{c.body}</p>
              <p className="mt-1 text-xs text-muted">{relationName(c.profiles)}</p>
            </li>
          ))}
          {!comments.length ? (
            <p className="text-sm text-muted">No questions yet.</p>
          ) : null}
        </ul>
      </Card>
    </Shell>
  );
}
