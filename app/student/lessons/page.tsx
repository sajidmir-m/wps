import { createClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { Card, Shell } from "@/components/ui";
import { redirect } from "next/navigation";
import type { Group, Lesson } from "@/lib/types";

export default async function StudentLessonsPage() {
  const user = await requireUser();
  if (!user || user.role === "ADMIN") redirect("/login");

  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*, groups(*)")
    .or(`group_id.is.null,group_id.eq.${user.groupId ?? "__none__"}`)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const lessonsTyped = (lessons || []) as (Lesson & { groups: Group | null })[];

  return (
    <Shell
      role="STUDENT"
      name={user.name}
      title="Lessons"
      subtitle="What was taught today and how — from the admin lesson log."
    >
      <div className="space-y-4">
        {lessonsTyped.map((lesson) => (
          <Card key={lesson.id}>
            <p className="text-xs uppercase tracking-wide text-muted">{lesson.date}</p>
            <h2 className="font-display mt-1 text-3xl">{lesson.topic}</h2>
            <p className="mt-1 text-sm text-muted">
              Method: {lesson.method}
              {lesson.groups ? ` · ${lesson.groups.name}` : " · All groups"}
            </p>
            {lesson.notes ? <p className="mt-3">{lesson.notes}</p> : null}
          </Card>
        ))}
        {!lessonsTyped.length ? (
          <Card>
            <p className="text-muted">No lessons published yet.</p>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
