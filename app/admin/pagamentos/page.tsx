import { redirect } from "next/navigation";

export default function PagamentosRedirectPage() {
  redirect("/admin/faturamento");
}
