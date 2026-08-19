import { createClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, Field, inputClass, btnPrimary, btnGhost } from "@/components/ui";
import { BulkImport } from "@/components/bulk-import";
import {
  addStudentAction,
  createGroupAction,
  deleteGroupAction,
  deleteStudentAction,
  updateStudentAction,
} from "@/app/actions/admin";
import { redirect } from "next/navigation";
import type { Group, Profile } from "@/lib/types";

export default async function StudentsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const supabase = await createClient();
  const [groupsData, studentsData] = await Promise.all([
    supabase.from("groups").select("*").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("*, groups(*)")
      .eq("role", "STUDENT")
      .order("group_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
  ]);

  const groups = (groupsData.data || []) as Group[];
  const students = (studentsData.data || []) as (Profile & { groups: Group | null })[];

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Students & groups"
      subtitle="Paste a student list, assign groups, and manage subscriptions here."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl">New group</h2>
          <form action={createGroupAction} className="mt-4 space-y-3">
            <Field label="Group name">
              <input name="name" required className={inputClass} placeholder="Group A" />
            </Field>
            <Field label="Description">
              <input name="description" className={inputClass} placeholder="Morning lab batch" />
            </Field>
            <button className={btnPrimary}>Create group</button>
          </form>
          <ul className="mt-5 space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-xl bg-off-white px-3 py-2"
              >
                <span>{g.name}</span>
                <form action={deleteGroupAction}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-sm text-danger font-medium hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Add one student</h2>
          <form action={addStudentAction} className="mt-4 space-y-3">
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Password (leave blank to auto-generate)">
              <input name="password" className={inputClass} placeholder="Auto-generated" />
            </Field>
            <Field label="Group">
              <select name="groupId" className={inputClass}>
                <option value="">Unassigned</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <button className={btnPrimary}>Add student</button>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-2xl">Paste student list</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Paste the list here when ready. Format: <b>Name, email</b> — one student per line.
        </p>
        <BulkImport groups={groups.map((g) => ({ id: g.id, name: g.name }))} />
      </Card>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="font-display mb-4 text-2xl">All students ({students.length})</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Group</th>
              <th className="pb-2">Subscription</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-3 font-medium">{s.name}</td>
                <td className="py-3 text-muted">{s.email}</td>
                <td className="py-3">
                  <form action={updateStudentAction} className="flex gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <select
                      name="groupId"
                      defaultValue={s.group_id || ""}
                      className="rounded-lg border border-line bg-white px-2 py-1"
                    >
                      <option value="">Unassigned</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="subscription"
                      defaultValue={s.subscription}
                      className="rounded-lg border border-line bg-white px-2 py-1"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                    <button className={btnGhost}>Save</button>
                  </form>
                </td>
                <td className="py-3">{s.subscription}</td>
                <td className="py-3 text-right">
                  <form action={deleteStudentAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-danger font-medium hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
