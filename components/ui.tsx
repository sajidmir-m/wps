import { logoutAction } from "@/app/actions/auth";
import type { Role } from "@/lib/types";
import {
  BookOpen,
  CalendarCheck,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Users,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/lessons", label: "Lessons", icon: BookOpen },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/credentials", label: "Student logins", icon: KeyRound },
  { href: "/admin/comments", label: "Questions", icon: MessageSquareText },
  { href: "/admin/reports", label: "Reports", icon: ClipboardList },
];

const studentLinks = [
  { href: "/student", label: "My dashboard", icon: LayoutDashboard },
  { href: "/student/attendance", label: "My attendance", icon: CalendarCheck },
  { href: "/student/lessons", label: "Lessons", icon: BookOpen },
  { href: "/student/comments", label: "Ask / feedback", icon: MessageSquareText },
];

export function Shell({
  role,
  name,
  children,
  title,
  subtitle,
}: {
  role: Role;
  name: string;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const links = role === "ADMIN" ? adminLinks : studentLinks;

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-white md:flex print:hidden">
          <div className="border-b border-white/10 px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">
              Womans Polytechnic
            </p>
            <p className="font-display mt-1 text-2xl leading-tight">College Srinagar</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/85 hover:bg-white/10 hover:text-white"
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction} className="border-t border-white/10 p-4">
            <p className="truncate text-sm text-white/80">{name}</p>
            <p className="mb-3 text-[11px] uppercase tracking-wider text-white/50">
              {role === "ADMIN" ? "Admin" : "Student"}
            </p>
            <button className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line bg-white px-4 py-4 md:px-8 print:hidden">
            <div>
              <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted">{subtitle}</p>
              ) : null}
            </div>
            <form action={logoutAction} className="md:hidden">
              <button className="rounded-lg border border-line px-3 py-1.5 text-sm bg-white hover:bg-off-white">
                Sign out
              </button>
            </form>
          </header>
          <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-4 py-2 md:hidden print:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-line bg-white px-3 py-1 text-sm hover:bg-off-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <main className="flex-1 bg-white p-4 md:p-8 print:p-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="font-display mt-2 text-4xl">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none ring-primary/30 focus:ring-2 focus:border-primary";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark";

export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-off-white";

export const btnDanger =
  "inline-flex items-center justify-center rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700";
