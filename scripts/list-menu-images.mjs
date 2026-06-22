import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (key) => {
  const match = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].replace(/^"|"$/g, "") : "";
};

const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
);

const { data, error } = await supabase
  .from("menu")
  .select("id,name,category,image")
  .order("id");

if (error) {
  console.error(error);
  process.exit(1);
}

for (const item of data) {
  const file = item.image?.split("/").pop() || "none";
  console.log(`${item.id}\t${item.category}\t${item.name}\t${file}`);
}

console.log(`\nTotal: ${data.length}`);
