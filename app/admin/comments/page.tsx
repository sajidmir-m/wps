import { createClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card, inputClass, btnPrimary } from "@/components/ui";
import { createCommentAction } from "@/app/actions/content";
import { redirect } from "next/navigation";
import type { Comment, Profile } from "@/lib/types";

export default async function CommentsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const supabase = await createClient();
  const { data: threadsData } = await supabase
    .from("comments")
    .select("*, profiles(*), replies:comments(*, profiles(*))")
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  const threads = (threadsData || []) as (Comment & {
    profiles: Profile;
    replies: (Comment & { profiles: Profile })[];
  })[];

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Questions & feedback"
      subtitle="Students post questions or feedback here. Reply below each thread."
    >
      <div className="space-y-4">
        {threads.map((thread) => (
          <Card key={thread.id}>
            <p className="text-xs text-muted">
              {thread.profiles?.name} · {thread.profiles?.email}
            </p>
            <p className="mt-2 text-lg">{thread.body}</p>
            <ul className="mt-4 space-y-2">
              {thread.replies?.map((reply) => (
                <li key={reply.id} className="rounded-xl bg-off-white px-3 py-2 text-sm">
                  <span className="font-medium">{reply.profiles?.name}: </span>
                  {reply.body}
                </li>
              ))}
            </ul>
            <form action={createCommentAction} className="mt-4 flex gap-2">
              <input type="hidden" name="parentId" value={thread.id} />
              <input
                name="body"
                required
                className={inputClass}
                placeholder="Reply as admin"
              />
              <button className={btnPrimary}>Reply</button>
            </form>
          </Card>
        ))}
        {!threads.length ? (
          <Card>
            <p className="text-muted">No questions yet.</p>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
}
