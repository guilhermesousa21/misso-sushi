import { cookies } from "next/headers";

export async function isAdminSessionValid() {
  const cookieStore = await cookies();
  return cookieStore.get("misso_admin_session")?.value === "ok";
}
