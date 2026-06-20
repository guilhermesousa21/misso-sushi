"use client";

import type { CSSProperties, FormEvent } from "react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/lib/useMediaQuery";

type MenuItem = {
  id?: number;
  name: string;
  price: number;
  category: string;
  image?: string;
};

type CategoryOption = {
  value: string;
  label: string;
};

interface AddItemFormProps {
  onAdd: (item: MenuItem) => Promise<void> | void;
}

const categories: CategoryOption[] = [
  { value: "entradas", label: "Entradas quentes" },
  { value: "frio", label: "Entradas frias" },
  { value: "sashimi", label: "Sashimis" },
  { value: "jyo", label: "Jyos" },
  { value: "niguiri", label: "Niguiris" },
  { value: "hot", label: "Hot rolls" },
  { value: "temaki", label: "Temakis" },
  { value: "yakissoba", label: "Yakissoba" },
  { value: "executivo", label: "Executivos" },
  { value: "poke", label: "Pokes" },
  { value: "combinado", label: "Combinados" },
  { value: "sobremesa", label: "Sobremesas" },
  { value: "bebida", label: "Bebidas" },
  { value: "drink", label: "Drinks" },
  { value: "destilado", label: "Destilados" },
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const numericPrice = Number(price);
  const canSubmit =
    name.trim().length > 0 &&
    category.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice > 0 &&
    !loading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Informe o nome do item.");
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Informe um preço maior que zero.");
      return;
    }

    if (!category) {
      setError("Escolha uma categoria.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const fileName = `${Date.now()}-${sanitizeFileName(imageFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("menu-images")
          .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from("menu-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }

      await onAdd({
        name: name.trim(),
        price: numericPrice,
        category,
        image: imageUrl,
      });

      setName("");
      setPrice("");
      setCategory("");
      setImageFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar o item agora."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ ...styles.form, ...(isMobile ? styles.formMobile : {}) }}>
      <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <div>
          <p style={styles.eyebrow}>Novo item</p>
          <h2 style={styles.title}>Adicionar ao cardápio</h2>
        </div>
        <span style={styles.previewPrice}>
          {numericPrice > 0 ? money(numericPrice) : "R$ 0,00"}
        </span>
      </header>

      <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
        <label style={styles.field}>
          <span style={styles.label}>Nome do prato</span>
          <input
            type="text"
            placeholder="Ex: Hot philadelphia"
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Preço</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.fieldWide}>
          <span style={styles.label}>Categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={styles.select}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section style={styles.uploadSection}>
        <div style={styles.uploadCopy}>
          <span style={styles.label}>Imagem do item</span>
          <p style={styles.muted}>
            Use uma foto clara do prato para facilitar a escolha no cardápio.
          </p>
        </div>

        <label style={styles.fileDrop}>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            style={styles.fileInput}
          />
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Pré-visualização do item"
              width={320}
              height={200}
              unoptimized
              style={styles.previewImage}
            />
          ) : (
            <span style={styles.uploadPlaceholder}>Selecionar imagem</span>
          )}
        </label>

        {imageFile && (
          <div style={styles.fileMeta}>
            <span>{imageFile.name}</span>
            <button
              type="button"
              onClick={() => setImageFile(null)}
              style={styles.removeButton}
            >
              Remover
            </button>
          </div>
        )}
      </section>

      {error && <p style={styles.error}>{error}</p>}

      <footer style={{ ...styles.actions, ...(isMobile ? styles.actionsMobile : {}) }}>
        <button
          type="button"
          onClick={() => {
            setName("");
            setPrice("");
            setCategory("");
            setImageFile(null);
            setError("");
          }}
          style={styles.secondaryButton}
          disabled={loading}
        >
          Limpar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.primaryButton,
            ...(!canSubmit ? styles.primaryButtonDisabled : {}),
          }}
        >
          {loading ? "Adicionando..." : "Adicionar item"}
        </button>
      </footer>
    </form>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    width: "100%",
    maxWidth: 760,
    display: "grid",
    gap: 18,
    marginBottom: 24,
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 22,
    color: "#1c1a17",
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  formMobile: {
    padding: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
  },
  headerMobile: {
    display: "grid",
  },
  eyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: 26,
    lineHeight: 1.1,
  },
  previewPrice: {
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "9px 12px",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(150px, 190px)",
    gap: 12,
  },
  gridMobile: {
    gridTemplateColumns: "1fr",
  },
  field: {
    display: "grid",
    gap: 7,
  },
  fieldWide: {
    display: "grid",
    gridColumn: "1 / -1",
    gap: 7,
  },
  label: {
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
  },
  input: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
  },
  select: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
  },
  uploadSection: {
    display: "grid",
    gap: 12,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
    paddingTop: 18,
  },
  uploadCopy: {
    display: "grid",
    gap: 4,
  },
  muted: {
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.45,
  },
  fileDrop: {
    minHeight: 180,
    border: "1px dashed rgba(28, 26, 23, 0.24)",
    borderRadius: 8,
    background: "#fff",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    cursor: "pointer",
  },
  fileInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  uploadPlaceholder: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "10px 14px",
    fontWeight: 850,
  },
  previewImage: {
    width: "100%",
    height: 220,
    objectFit: "cover",
  },
  fileMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    color: "#625b53",
    fontSize: 13,
  },
  removeButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fff",
    color: "#1c1a17",
    padding: "8px 11px",
    cursor: "pointer",
    fontWeight: 850,
  },
  error: {
    borderRadius: 8,
    background: "#fee2e2",
    color: "#991b1b",
    padding: 12,
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionsMobile: {
    display: "grid",
  },
  secondaryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fff",
    color: "#1c1a17",
    padding: "12px 15px",
    cursor: "pointer",
    fontWeight: 850,
  },
  primaryButton: {
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 850,
  },
  primaryButtonDisabled: {
    background: "#c9c0b4",
    cursor: "not-allowed",
  },
};
