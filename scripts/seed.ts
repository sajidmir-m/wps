import { supabaseAdmin } from "../lib/supabase-admin";
import { todayISO } from "../lib/dates";

async function seed() {
  const startDate = todayISO();

  // Default training settings
  await supabaseAdmin
    .from("training_settings")
    .upsert({
      id: "default",
      batch_name: "30-Day Industrial Training",
      college_name: "Womans Polytechnic College Srinagar",
      start_date: startDate,
      duration_days: 30,
    })
    .eq("id", "default");

  // Create groups
  const groups = [
    { name: "Group A", description: "Morning batch — lab + theory" },
    { name: "Group B", description: "Afternoon batch — project work" },
    { name: "Group C", description: "Mixed batch" },
  ];

  const createdGroups: { id: string; name: string }[] = [];
  for (const g of groups) {
    const { data, error } = await supabaseAdmin
      .from("groups")
      .insert({ name: g.name, description: g.description })
      .select("id, name")
      .single();
    if (error) {
      const { data: existing } = await supabaseAdmin
        .from("groups")
        .select("id, name")
        .eq("name", g.name)
        .single();
      if (existing) createdGroups.push(existing);
    } else if (data) {
      createdGroups.push(data);
    }
  }

  // Admin user
  const adminEmail = "admin@wpcollege.local";
  const { data: existingAdmin } = await supabaseAdmin.auth.admin.listUsers();
  const adminUser = existingAdmin?.users.find((u) => u.email === adminEmail);

  let adminId = adminUser?.id;
  if (!adminId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: "admin123",
      email_confirm: true,
      user_metadata: {
        name: "College Admin",
        role: "ADMIN",
        subscription: "ACTIVE",
      },
    });
    if (error) throw error;
    adminId = data.user!.id;
  } else {
    await supabaseAdmin.auth.admin.updateUserById(adminId, {
      password: "admin123",
      user_metadata: {
        name: "College Admin",
        role: "ADMIN",
        subscription: "ACTIVE",
      },
    });
  }

  // Sample students
  const sample = [
    ["Aarav Sharma", "aarav@student.local"],
    ["Diya Patel", "diya@student.local"],
    ["Kabir Singh", "kabir@student.local"],
    ["Ananya Iyer", "ananya@student.local"],
    ["Rohan Gupta", "rohan@student.local"],
    ["Meera Joshi", "meera@student.local"],
    ["Ishaan Verma", "ishaan@student.local"],
    ["Sara Khan", "sara@student.local"],
  ] as const;

  for (let i = 0; i < sample.length; i++) {
    const [name, email] = sample[i];
    const groupId = createdGroups[i % createdGroups.length]?.id;

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const student = existing?.users.find((u) => u.email === email);

    if (!student) {
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: "student123",
        email_confirm: true,
        user_metadata: {
          name,
          role: "STUDENT",
          subscription: "ACTIVE",
          group_id: groupId,
        },
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(student.id, {
        password: "student123",
        user_metadata: {
          name,
          role: "STUDENT",
          subscription: "ACTIVE",
          group_id: groupId,
        },
      });
    }
  }

  console.log("Seeded Womans Polytechnic College Srinagar.");
  console.log("Admin:   admin@wpcollege.local / admin123");
  console.log("Student: aarav@student.local / student123");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
