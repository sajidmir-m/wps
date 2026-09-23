import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase
    .from("exams")
    .update({ presentation_max: 10 })
    .not("id", "is", null)
    .select("id, title, presentation_max");

  if (error) throw error;
  console.log("Updated exams to presentation_max=10:");
  for (const exam of data || []) {
    console.log(`- ${exam.title}: ${exam.presentation_max}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
