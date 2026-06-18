import { redirect } from "next/navigation";

export default function AdminCustomersRedirect() {
  redirect("/admin/pedidos");
}
