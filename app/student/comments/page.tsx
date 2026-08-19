import { createClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { Card, Shell, Field, inputClass, btnPrimary } from "@/components/ui";
import { createCommentAction } from "@/app/actions/content";
import { redirect } from "next/navigation";
import type { Comment, Profile } from "@/lib/types";

export default async function StudentCommentsPage() {
  const user = await requireUser();
  if (!user || user.role === "ADMIN") redirect("/login");

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
      role="STUDENT"
      name={user.name}
      title="Ask / feedback"
      subtitle="Write a question or feedback below. The admin will reply."
    >
      <Card>
        <h2 className="font-display text-2xl">Write a comment</h2>
        <form action={createCommentAction} className="mt-4 space-y-3">
          <Field label="Question or feedback">
            <textarea
              name="body"
              required
              rows={4}
              className={inputClass}
              placeholder="Doubt about today's topic or general feedback…"
            />
          </Field>
          <button className={btnPrimary} disabled={user.subscription !== "ACTIVE"}>
            Post comment
          </button>
        </form>
      </Card>
      <div className="mt-6 space-y-4">
        {threads.map((thread) => (
          <Card key={thread.id}>
            <p className="text-xs text-muted">{thread.profiles?.name}</p>
            <p className="mt-2">{thread.body}</p>
            <ul className="mt-3 space-y-2">
              {thread.replies?.map((reply) => (
                <li key={reply.id} className="rounded-xl bg-off-white px-3 py-2 text-sm">
                  <span className="font-medium">{reply.profiles?.name}: </span>
                  {reply.body}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
