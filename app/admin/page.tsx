import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ cliente?: string }>;
};

export default async function AdminRootPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (params.cliente) {
    redirect(`/admin/faturamento?cliente=${encodeURIComponent(params.cliente)}`);
  }
  redirect("/admin/faturamento");
}
