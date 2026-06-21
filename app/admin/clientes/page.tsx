import { redirect } from "next/navigation";

export default function ClientesRedirectPage() {
  redirect("/admin/faturamento");
}
