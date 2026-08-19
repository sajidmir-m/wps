# Womans Polytechnic College Srinagar — Training Desk

English-language college training desk for attendance, daily lessons, and student feedback. Built on **Supabase** (Auth + PostgreSQL).

## What it does

- Admin dashboard: groups, students, 30-day attendance, reports
- Daily lesson log: topic and teaching method
- Email + password login / signup — no OTP
- Student subscription status (Active / Suspended / Expired)
- Comments box for questions and feedback
- Average attendance, streaks, and continuous attendance tracking

## Tech stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth + Supabase Database (PostgreSQL)

## Setup

1. Create a project on [Supabase](https://supabase.com).
2. Copy your project URL and anon key into `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Open the Supabase SQL Editor and run each file in `supabase/migrations/` in order:
   - `001_schema.sql` — tables, row-level security, and the new-user trigger
   - `002_student_credentials.sql` — admin-only table holding each student's generated password
4. Install dependencies and start the app:

```bash
npm install
npm run dev
```

5. Open http://localhost:3000

### Create the first admin

There are no built-in accounts. Create your own in the Supabase dashboard under **Authentication → Users → Add user**, tick **Confirm email**, and set the user metadata to:

```json
{ "name": "Your Name", "role": "ADMIN", "subscription": "ACTIVE" }
```

The trigger from `001_schema.sql` creates the matching profile row automatically. Log in with that email and password to reach the admin dashboard.

## Add your student list

Admin → **Students** → paste the list as:

```
Name, email
Name, email
```

Email is optional. Without one, an address is generated from the name.

## Student logins

Every student gets their own randomly generated password. Admin → **Student logins** shows one printable slip per student with their email and password; print it, cut the boxes, and hand them out.

Supabase only stores a password hash, so the readable copy lives in the admin-only `student_credentials` table. Use **New password** on a slip to reset one student, or **Generate new passwords** to reissue for everyone.

## Attendance and reports

Attendance is recorded per date — pick a date, mark each student, save. Admin → **Reports** shows a day-by-day summary plus each student's average, streak, and present/late/absent totals across every recorded day.

## White theme & buttons

The app uses a clean white background with high-contrast blue primary buttons, green/red/yellow status buttons, and a dark sidebar. Buttons use solid fills or clear borders so text is always readable and never overlaps.
