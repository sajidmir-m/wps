import { cache } from "react";
import { createClient } from "./supabase";
import type { Role, SubscriptionStatus, SessionUser } from "./types";
import type { User } from "@supabase/supabase-js";

function fromJwt(user: User): SessionUser | null {
  const meta = user.user_metadata ?? {};
  const role = meta.role as Role | undefined;
  if (role !== "ADMIN" && role !== "STUDENT") return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: (meta.name as string) || "User",
    role,
    subscription: (meta.subscription as SubscriptionStatus) || "ACTIVE",
    groupId: (meta.group_id as string | null) ?? null,
  };
}

// Cookie JWT is enough for most pages/actions. We only hit the profiles table
// when the token is missing a role — that extra round trip was making every
// click wait on Supabase.
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const fromToken = fromJwt(user);
  if (fromToken) return fromToken;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, subscription, group_id")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.name ?? (user.user_metadata?.name as string | undefined) ?? "User",
    role: (profile?.role as Role) ?? "STUDENT",
    subscription: (profile?.subscription as SubscriptionStatus) ?? "ACTIVE",
    groupId: (profile?.group_id as string | null) ?? null,
  };
});

export async function requireUser() {
  return getSession();
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
