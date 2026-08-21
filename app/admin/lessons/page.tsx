import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { Shell, Card, Field, inputClass, btnPrimary, btnGhost } from "@/components/ui";
import { createLessonAction, deleteLessonAction } from "@/app/actions/content";
import { redirect } from "next/navigation";
import type { Group, Lesson } from "@/lib/types";

const methods = [
  "Lecture",
  "Lab / practical",
  "Live demo",
  "Discussion",
  "Project work",
  "Assignment",
  "Revision",
];

export default async function LessonsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [groupsData, lessonsData] = await Promise.all([
    supabaseAdmin.from("groups").select("*").order("name", { ascending: true }),
    supabaseAdmin
      .from("lessons")
      .select("*, groups(*)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const groups = (groupsData.data || []) as Group[];
  const lessons = (lessonsData.data || []) as (Lesson & { groups: Group | null })[];

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Daily lessons"
      subtitle="Record what was taught each day and how. Students will see this lesson log."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="font-display text-2xl">New lesson</h2>
          <form action={createLessonAction} className="mt-4 space-y-3">
            <Field label="Date">
              <input name="date" type="date" defaultValue={todayISO()} className={inputClass} />
            </Field>
            <Field label="Topic">
              <input
                name="topic"
                required
                className={inputClass}
                placeholder="Example: HTML forms + validation"
              />
            </Field>
            <Field label="Method">
              <select name="method" className={inputClass}>
                {methods.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Group">
              <select name="groupId" className={inputClass}>
                <option value="">All groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                rows={4}
                className={inputClass}
                placeholder="Short note: examples, homework, next class plan"
              />
            </Field>
            <button className={btnPrimary}>Save lesson</button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Lesson log</h2>
          <ul className="mt-4 space-y-3">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-2xl border border-line bg-off-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">{lesson.date}</p>
                    <p className="font-display mt-1 text-xl">{lesson.topic}</p>
                    <p className="text-sm text-muted">
                      {lesson.method}
                      {lesson.groups ? ` · ${lesson.groups.name}` : " · All groups"}
                    </p>
                    {lesson.notes ? <p className="mt-2 text-sm">{lesson.notes}</p> : null}
                  </div>
                  <form action={deleteLessonAction}>
                    <input type="hidden" name="id" value={lesson.id} />
                    <button className={btnGhost}>Delete</button>
                  </form>
                </div>
              </li>
            ))}
            {!lessons.length ? (
              <p className="text-sm text-muted">Add the first lesson.</p>
            ) : null}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
