import { createClient } from "./supabase";
import type { Role, SubscriptionStatus, SessionUser } from "./types";

export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, subscription, group_id")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.name ?? user.user_metadata?.name ?? "User",
    role: (profile?.role as Role) ?? (user.user_metadata?.role as Role) ?? "STUDENT",
    subscription:
      (profile?.subscription as SubscriptionStatus) ??
      (user.user_metadata?.subscription as SubscriptionStatus) ??
      "ACTIVE",
    groupId: (profile?.group_id as string | null) ?? null,
  };
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function clearSession() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
