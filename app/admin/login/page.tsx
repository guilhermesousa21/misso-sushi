"use client";

import type { CSSProperties, FormEvent } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
  const next = searchParams.get("next") || "/admin";
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
      <form onSubmit={handleSubmit} style={styles.card}>
        <p style={styles.eyebrow}>Missô Admin</p>
        <h1 style={styles.title}>Entrar</h1>
        <p style={styles.subtitle}>Área restrita da operação</p>
        <label style={styles.field}>
          <span style={styles.label}>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={styles.input}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    alignItems: "center",
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "calc(20px + env(safe-area-inset-top, 0px)) 16px calc(20px + env(safe-area-inset-bottom, 0px))",
  },
  card: {
    width: "min(420px, 100%)",
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.08)",
    display: "grid",
    gap: 16,
  },
  eyebrow: { color: "#9f1d2f", fontSize: 12, fontWeight: 850, textTransform: "uppercase" },
  title: { fontSize: 30, lineHeight: 1.05, fontWeight: 900 },
  subtitle: { color: "#766e64", fontSize: 14, lineHeight: 1.4, marginTop: -8 },
  field: { display: "grid", gap: 7 },
  label: { fontWeight: 850, color: "#514a43" },
  input: {
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
    color: "#1c1a17",
    minHeight: 48,
    fontSize: 16,
  },
  error: { color: "#991b1b", fontWeight: 800 },
  button: {
    border: "none",
    borderRadius: 12,
    background: "#9f1d2f",
    color: "#fff",
    padding: 14,
    cursor: "pointer",
    fontWeight: 850,
    minHeight: 48,
    fontSize: 16,
  },
};
