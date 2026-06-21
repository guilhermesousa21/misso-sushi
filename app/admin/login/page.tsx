"use client";

import type { CSSProperties, FormEvent } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { eyebrowStyle, pageTitleStyle } from "../../../lib/uiStyles";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main style={styles.page} />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin/faturamento";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Senha invalida.");
      return;
    }

    router.push(next);
  }

  return (
    <main style={styles.page}>
      <Card style={styles.card}>
        <BrandLogo size="sm" />
        <p style={{ ...eyebrowStyle, marginTop: 16 }}>Area restrita</p>
        <h1 style={styles.title}>Entrar no admin</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <Button type="submit" disabled={loading} fullWidth size="lg">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    padding: 20,
  },
  card: {
    width: "min(420px, 100%)",
    display: "grid",
    gap: 4,
  },
  title: {
    ...pageTitleStyle,
    marginTop: 6,
    fontSize: 34,
  },
  form: {
    marginTop: 12,
    display: "grid",
    gap: 14,
  },
  error: { color: "#991b1b", fontWeight: 800 },
};
