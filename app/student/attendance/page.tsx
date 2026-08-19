import { createClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { computeStats, statusLabel } from "@/lib/stats";
import { Card, Shell } from "@/components/ui";
import { redirect } from "next/navigation";
import type { AttendanceStatus } from "@/lib/types";

export default async function StudentAttendancePage() {
  const user = await requireUser();
  if (!user || user.role === "ADMIN") redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", user.id)
    .order("date", { ascending: false });

  const records = (data || []).map((r) => ({
    date: r.date as string,
    status: r.status as AttendanceStatus,
  }));

  const stats = computeStats(records);

  return (
    <Shell
      role="STUDENT"
      name={user.name}
      title="My attendance"
      subtitle="Every day that has been marked, with your average and streak."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Average</p>
          <p className="font-display text-4xl">
            {stats.marked === 0 ? "—" : `${stats.percent}%`}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Present</p>
          <p className="font-display text-4xl">{stats.present}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Absent</p>
          <p className="font-display text-4xl">{stats.absent}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-muted">Streak</p>
          <p className="font-display text-4xl">{stats.streak}</p>
        </Card>
      </div>
      <Card>
        {records.length ? (
          <ul className="divide-y divide-line">
            {records.map((record) => (
              <li key={record.date} className="flex items-center justify-between py-3">
                <p className="font-medium">{formatDisplayDate(record.date)}</p>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    record.status === "PRESENT"
                      ? "bg-success text-white"
                      : record.status === "LATE"
                        ? "bg-warning text-white"
                        : "bg-danger text-white"
                  }`}
                >
                  {statusLabel(record.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No attendance has been marked for you yet.</p>
        )}
      </Card>
    </Shell>
  );
}
