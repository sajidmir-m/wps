import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { todayISO, formatDisplayDate } from "@/lib/dates";
import { Shell, Card } from "@/components/ui";
import { AttendanceBoard } from "@/components/attendance-board";
import { AttendanceFilters } from "@/components/attendance-filters";
import { redirect } from "next/navigation";
import type { Group, AttendanceRecord, Profile } from "@/lib/types";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; date?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const params = await searchParams;
  const date = params.date || todayISO();
  const groupId = params.group ?? "";

  let studentsQuery = supabaseAdmin
    .from("profiles")
    .select("id, name, email, group_id")
    .eq("role", "STUDENT")
    .order("name", { ascending: true });
  if (groupId) studentsQuery = studentsQuery.eq("group_id", groupId);

  const [groupsData, studentsData, attendanceData, markedData] = await Promise.all([
    supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
    studentsQuery,
    supabaseAdmin.from("attendance").select("student_id, status").eq("date", date),
    supabaseAdmin.from("attendance").select("date").order("date", { ascending: false }).limit(3000),
  ]);

  const groups = (groupsData.data || []) as Group[];
  const allStudents = (studentsData.data || []) as Profile[];
  const attendance = (attendanceData.data || []) as AttendanceRecord[];

  const markedDates = [
    ...new Set(((markedData.data || []) as { date: string }[]).map((row) => row.date)),
  ].slice(0, 12);
  const lastMarked = markedDates.find((marked) => marked !== date) ?? null;

  const students = allStudents
    .filter((s) => (groupId ? s.group_id === groupId : true))
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      existing: attendance.find((a) => a.student_id === s.id)?.status ?? null,
    }));

  const savedCount = students.filter((s) => s.existing).length;

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Attendance"
      subtitle="Pick a date, mark each student, and save. Each date is stored separately."
    >
      <Card>
        <AttendanceFilters
          groups={groups}
          date={date}
          groupId={groupId}
          markedDates={markedDates}
        />
        <p className="mt-3 text-sm text-muted">
          {students.length} students ·{" "}
          {savedCount > 0
            ? `${savedCount} already saved for this date`
            : "nothing saved for this date yet"}
        </p>
      </Card>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-2xl">Marking</h2>
          <span className="rounded-lg bg-primary-light px-2.5 py-1 text-sm font-medium text-primary-dark">
            {formatDisplayDate(date)}
            {date === todayISO() ? " · today" : ""}
          </span>
        </div>

        {savedCount === 0 ? (
          <p className="mb-4 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
            No attendance was ever saved for {formatDisplayDate(date)}, so every student below
            starts unmarked.
            {lastMarked
              ? ` The last day you marked was ${formatDisplayDate(lastMarked)}.`
              : ""}
          </p>
        ) : null}
        <AttendanceBoard key={`${date}-${groupId}`} date={date} students={students} />
      </Card>
    </Shell>
  );
}
