"use client";

import type { CSSProperties } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "../AdminShell";
import FaturamentoTab from "../tabs/FaturamentoTab";

function FaturamentoContent() {
  const searchParams = useSearchParams();
  const clienteSearch = searchParams.get("cliente") || "";

  return (
    <AdminShell eyebrow="Financeiro" title="Faturamento">
      <FaturamentoTab initialSearch={clienteSearch} />
    </AdminShell>
  );
}

export default function FaturamentoPage() {
  return (
    <Suspense fallback={<div style={styles.loading}>Carregando faturamento...</div>}>
      <FaturamentoContent />
    </Suspense>
  );
}

const styles: Record<string, CSSProperties> = {
  loading: {
    padding: 32,
    color: "#766e64",
    textAlign: "center",
  },
};
