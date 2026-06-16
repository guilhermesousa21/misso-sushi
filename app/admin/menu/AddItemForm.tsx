"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type MenuItem = {
  id?: number;
  name: string;
  price: number;
  category: string;
  image?: string;
};

interface AddItemFormProps {
  onAdd: (item: MenuItem) => Promise<void> | void;
}

export default function AddItemForm({ onAdd }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;

    setLoading(true);

    let imageUrl: string | undefined = undefined;

    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;
      const { data, error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, imageFile);

      if (!error && data) {
        const { data: publicUrl } = supabase.storage
          .from("menu-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }
    }

    const newItem: MenuItem = {
      name,
      price,
      category,
      image: imageUrl,
    };

    await onAdd(newItem);

    setName("");
    setPrice(0);
    setCategory("");
    setImageFile(null);
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 16,
        maxWidth: 500,
        marginBottom: 24,
        background: "#ffffff",
        padding: 28,
        borderRadius: 16,
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#1f2937" }}>
        ➕ Adicionar novo item
      </h2>

      <input
        type="text"
        placeholder="Nome do prato"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          fontSize: 15,
        }}
      />

      <input
        type="number"
        placeholder="Preço"
        value={price}
        onChange={(e) => setPrice(parseFloat(e.target.value))}
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          fontSize: 15,
        }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          fontSize: 15,
          background: "#f9fafb",
        }}
      >
        <option value="">Selecione a categoria</option>
        <option value="entrada">🥗 Entrada</option>
        <option value="sushi">🍣 Sushi</option>
        <option value="bebida">🥤 Bebida</option>
        <option value="sobremesa">🍰 Sobremesa</option>
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        style={{
          padding: 8,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          background: "#fff",
        }}
      />

      {imageFile && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            style={{
              width: 140,
              height: 140,
              borderRadius: 12,
              objectFit: "cover",
              border: "2px solid #3b82f6",
              marginBottom: 6,
            }}
          />
          <p style={{ fontSize: 13, color: "#6b7280" }}>Pré-visualização da imagem</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "14px 22px",
          borderRadius: 10,
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          background: loading
            ? "#9ca3af"
            : "linear-gradient(to right, #2563eb, #3b82f6)",
          color: "#fff",
          transition: "background 0.3s, transform 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {loading ? "Adicionando..." : "Adicionar Item"}
      </button>
    </form>
  );
}
