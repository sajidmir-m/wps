import { createClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { computeStats } from "@/lib/stats";
import { Card, Shell, Stat } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Group, Lesson, Comment, AttendanceStatus } from "@/lib/types";

export default async function StudentHome() {
  const user = await requireUser();
  if (!user || user.role === "ADMIN") redirect("/login");

  const supabase = await createClient();

  const [fullData, attendanceData, lessonsData, commentsData] = await Promise.all([
    supabase.from("profiles").select("*, groups(*)").eq("id", user.id).single(),
    supabase.from("attendance").select("*").eq("student_id", user.id),
    supabase
      .from("lessons")
      .select("*, groups(*)")
      .or(`group_id.is.null,group_id.eq.${user.groupId ?? "__none__"}`)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("comments")
      .select("*")
      .eq("author_id", user.id)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const full = fullData.data as { groups: Group | null } | null;
  const lessons = (lessonsData.data || []) as (Lesson & { groups: Group | null })[];
  const comments = (commentsData.data || []) as Comment[];

  const attendanceRecords = (attendanceData.data || []).map((a) => ({
    date: a.date as string,
    status: a.status as AttendanceStatus,
  }));

  const stats = computeStats(attendanceRecords);

  return (
    <Shell
      role="STUDENT"
      name={user.name}
      title={`Hello, ${user.name.split(" ")[0]}`}
      subtitle={`${full?.groups?.name || "Group pending"} · Subscription ${user.subscription}`}
    >
      {user.subscription !== "ACTIVE" ? (
        <Card className="mb-6 border-danger/40">
          <p className="text-danger">
            Your subscription is {user.subscription.toLowerCase()}. Ask the admin to activate it
            before posting comments.
          </p>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Attendance"
          value={stats.marked === 0 ? "—" : `${stats.percent}%`}
          hint={`${stats.marked} days marked`}
        />
        <Stat label="Present" value={stats.present} />
        <Stat label="Current streak" value={stats.streak} hint="Continuous present/late" />
        <Stat
          label="Status"
          value={stats.continuous && stats.marked ? "Regular" : "Watch"}
          hint={stats.absent ? `${stats.absent} absent` : "No absence"}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent lessons</h2>
            <Link href="/student/lessons" className="text-sm text-primary font-medium">
              All lessons
            </Link>
          </div>
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id}>
                <p className="font-medium">{l.topic}</p>
                <p className="text-sm text-muted">
                  {l.date} · {l.method}
                </p>
              </li>
            ))}
            {!lessons.length ? (
              <p className="text-sm text-muted">Lesson log is currently empty.</p>
            ) : null}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Your questions</h2>
            <Link href="/student/comments" className="text-sm text-primary font-medium">
              Ask something
            </Link>
          </div>
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-off-white px-3 py-2 text-sm">
                {c.body}
              </li>
            ))}
            {!comments.length ? (
              <p className="text-sm text-muted">Use the comments box to ask a question.</p>
            ) : null}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
