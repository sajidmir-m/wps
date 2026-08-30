import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { Shell, Card } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Group, AttendanceRecord, AttendanceStatus } from "@/lib/types";

export default async function ReportsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [studentsData, groupsData, attendanceData] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, name, email, group_id").eq("role", "STUDENT").order("name", { ascending: true }),
    supabaseAdmin.from("groups").select("id, name"),
    supabaseAdmin.from("attendance").select("student_id, date, status").order("date", { ascending: true }),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const groups = (groupsData.data || []) as Group[];
  const attendance = (attendanceData.data || []) as AttendanceRecord[];

  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const record of attendance) {
    const list = byStudent.get(record.student_id);
    if (list) list.push(record);
    else byStudent.set(record.student_id, [record]);
  }

  const allDates = Array.from(new Set(attendance.map((a) => a.date))).sort();

  const rows = students
    .map((student) => {
      const records = byStudent.get(student.id) || [];
      return {
        student,
        statusByDate: new Map(records.map((r) => [r.date, r.status])),
        stats: computeStats(records),
      };
    })
    .sort((a, b) => {
      if (a.stats.marked === 0 && b.stats.marked > 0) return 1;
      if (b.stats.marked === 0 && a.stats.marked > 0) return -1;
      return b.stats.percent - a.stats.percent;
    });

  const dailySummary = allDates.map((date) => {
    const records = attendance.filter((a) => a.date === date);
    return {
      date,
      present: records.filter((r) => r.status === "PRESENT").length,
      late: records.filter((r) => r.status === "LATE").length,
      absent: records.filter((r) => r.status === "ABSENT").length,
      total: records.length,
    };
  });

  const statusColor = (status?: AttendanceStatus) =>
    status === "PRESENT"
      ? "bg-success"
      : status === "LATE"
        ? "bg-warning"
        : status === "ABSENT"
          ? "bg-danger"
          : "bg-line";

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Reports"
      subtitle={
        allDates.length
          ? `${allDates.length} days recorded · ${formatDisplayDate(allDates[0])} to ${formatDisplayDate(allDates[allDates.length - 1])}`
          : "No attendance recorded yet"
      }
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin/reports/print"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Export PDF
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Days recorded</p>
          <p className="font-display mt-1 text-3xl">{allDates.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Never absent</p>
          <p className="font-display mt-1 text-3xl">
            {rows.filter((r) => r.stats.continuous && r.stats.marked > 0).length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Below 75%</p>
          <p className="font-display mt-1 text-3xl">
            {rows.filter((r) => r.stats.marked > 0 && r.stats.percent < 75).length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Best streak</p>
          <p className="font-display mt-1 text-3xl">
            {rows.reduce((max, r) => Math.max(max, r.stats.streak), 0)} days
          </p>
        </Card>
      </div>

      {allDates.length ? (
        <Card className="mb-6">
          <h2 className="font-display mb-4 text-2xl">Day by day</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Present</th>
                  <th className="pb-2">Late</th>
                  <th className="pb-2">Absent</th>
                  <th className="pb-2">Marked</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((day) => (
                  <tr key={day.date} className="border-t border-line">
                    <td className="py-2.5 font-medium">{formatDisplayDate(day.date)}</td>
                    <td className="py-2.5 text-success">{day.present}</td>
                    <td className="py-2.5 text-warning">{day.late}</td>
                    <td className="py-2.5 text-danger">{day.absent}</td>
                    <td className="py-2.5 text-muted">{day.total}</td>
                    <td className="py-2.5 text-right">
                      <Link
                        href={`/admin/attendance?date=${day.date}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {!allDates.length ? (
        <Card>
          <p className="text-muted">
            No attendance has been marked yet. Go to <b>Attendance</b>, pick a date, mark the
            students, and click <b>Save attendance</b>.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <h2 className="font-display mb-4 text-2xl">Student averages</h2>
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="pb-2">Student</th>
                <th className="pb-2">Group</th>
                <th className="pb-2">Average</th>
                <th className="pb-2">Streak</th>
                <th className="pb-2">P / L / A</th>
                <th className="pb-2">Days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, stats, statusByDate }) => (
                <tr key={student.id} className="border-t border-line align-top">
                  <td className="py-3">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted">{student.email}</p>
                  </td>
                  <td className="py-3">
                    {student.group_id ? groupName.get(student.group_id) || "—" : "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={
                        stats.marked === 0
                          ? "text-muted"
                          : stats.percent < 75
                            ? "text-danger"
                            : "text-success"
                      }
                    >
                      {stats.marked === 0 ? "—" : `${stats.percent}%`}
                    </span>
                  </td>
                  <td className="py-3">
                    {stats.streak}
                    {stats.continuous && stats.marked > 0 ? " · never absent" : ""}
                  </td>
                  <td className="py-3 text-muted">
                    {stats.present} / {stats.late} / {stats.absent}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {allDates.map((d) => (
                        <span
                          key={d}
                          title={`${formatDisplayDate(d)} — ${statusByDate.get(d)?.toLowerCase() || "unmarked"}`}
                          className={`inline-block h-3 w-3 rounded-sm ${statusColor(statusByDate.get(d))}`}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Shell>
  );
}
