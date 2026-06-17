"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { supabase } from "../../../lib/supabase";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { MenuItem } from "../../../types";

type EditableMenuItem = MenuItem & { isNew?: boolean };
type DeletedMenuItem = MenuItem & { deleted: true };
type DragState =
  | { type: "category"; category: string }
  | { type: "item"; itemId: number };

const categoryLabels: Record<string, string> = {
  entradas: "Entradas quentes",
  frio: "Entradas frias",
  sashimi: "Sashimis",
  jyo: "Jyos",
  niguiri: "Niguiris",
  hot: "Hot rolls",
  temaki: "Temakis",
  yakissoba: "Yakissoba",
  executivo: "Executivos",
  poke: "Pokes",
  combinado: "Combinados",
  sobremesa: "Sobremesas",
  bebida: "Bebidas",
  drink: "Drinks",
  destilado: "Destilados",
};

const defaultCategoryOrder = [
  "entradas",
  "frio",
  "sashimi",
  "jyo",
  "niguiri",
  "hot",
  "temaki",
  "yakissoba",
  "executivo",
  "poke",
  "combinado",
  "sobremesa",
  "bebida",
  "drink",
  "destilado",
];

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getFallbackCategoryOrder = (category: string) => {
  const index = defaultCategoryOrder.indexOf(category);
  return index === -1 ? defaultCategoryOrder.length : index;
};

const sortItems = (menuItems: MenuItem[]) =>
  [...menuItems].sort((a, b) => {
    const aOrder =
      typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "pt-BR");
  });

const getOrderedCategories = (menuItems: MenuItem[]) => {
  const categoryMap = new Map<string, number>();

  menuItems.forEach((item) => {
    const savedOrder =
      typeof item.category_order === "number"
        ? item.category_order
        : getFallbackCategoryOrder(item.category);
    const currentOrder = categoryMap.get(item.category);

    if (currentOrder === undefined || savedOrder < currentOrder) {
      categoryMap.set(item.category, savedOrder);
    }
  });

  return Array.from(categoryMap.entries())
    .sort(([aCategory, aOrder], [bCategory, bOrder]) => {
      if (aOrder !== bOrder) return aOrder - bOrder;
      return aCategory.localeCompare(bCategory, "pt-BR");
    })
    .map(([category]) => category);
};

const moveValue = <T,>(values: T[], from: number, to: number) => {
  const next = [...values];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const uniqueById = (menuItems: MenuItem[]) => {
  const seen = new Set<number>();

  return menuItems.filter((item) => {
    if (typeof item.id !== "number") return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const isMobile = useMediaQuery("(max-width: 760px)");
  const isTablet = useMediaQuery("(max-width: 1040px)");
  const [editingItem, setEditingItem] = useState<EditableMenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dragged, setDragged] = useState<DragState | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const pathname = usePathname();
  const canReorder = !search.trim() && !filterCategory;

  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (!error && data) setItems(uniqueById(data as MenuItem[]));
    }

    fetchMenu();
  }, []);

  const handleAddItem = () => {
    setEditingItem({
      id: 0,
      name: "",
      price: 0,
      category: "entradas",
      category_order: getFallbackCategoryOrder("entradas"),
      sort_order: items.filter((item) => item.category === "entradas").length,
      description: "",
      active: true,
      availability_status: "ativo",
      isNew: true,
    });
  };

  const persistCategoryOrder = async (orderedCategories: string[]) => {
    setSavingOrder(true);

    const updates = await Promise.all(
      orderedCategories.map((category, index) =>
        supabase.from("menu").update({ category_order: index }).eq("category", category)
      )
    );

    setSavingOrder(false);

    const failed = updates.find(({ error }) => error);
    if (failed?.error) {
      toast.error("Crie a coluna category_order no Supabase para salvar a ordem.");
      return;
    }

    toast.success("Ordem das categorias salva.");
  };

  const persistItemOrder = async (orderedItems: MenuItem[]) => {
    setSavingOrder(true);

    const updates = await Promise.all(
      orderedItems.map((item) =>
        supabase
          .from("menu")
          .update({
            category: item.category,
            category_order: item.category_order ?? getFallbackCategoryOrder(item.category),
            sort_order: item.sort_order ?? 0,
          })
          .eq("id", Number(item.id))
      )
    );

    setSavingOrder(false);

    const failed = updates.find(({ error }) => error);
    if (failed?.error) {
      toast.error("Crie as colunas category_order e sort_order no Supabase para salvar a ordem.");
      return;
    }

    toast.success("Ordem dos itens salva.");
  };

  const handleCategoryDrop = async (targetCategory: string) => {
    if (!canReorder || dragged?.type !== "category" || dragged.category === targetCategory) {
      setDragged(null);
      return;
    }

    const categories = getOrderedCategories(items);
    const fromIndex = categories.indexOf(dragged.category);
    const toIndex = categories.indexOf(targetCategory);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextCategories = moveValue(categories, fromIndex, toIndex);
    const nextItems = items.map((item) => ({
      ...item,
      category_order: nextCategories.indexOf(item.category),
    }));

    setItems(nextItems);
    setDragged(null);
    await persistCategoryOrder(nextCategories);
  };

  const handleItemDrop = async (targetItem: MenuItem, targetCategory: string) => {
    if (!canReorder || dragged?.type !== "item" || dragged.itemId === targetItem.id) {
      setDragged(null);
      return;
    }

    const draggedItem = items.find((item) => item.id === dragged.itemId);
    if (!draggedItem) return;

    const categories = getOrderedCategories(items);
    const categoryOrderMap = new Map(categories.map((category, index) => [category, index]));
    const grouped = items.reduce((acc, item) => {
      if (item.id !== draggedItem.id) {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
      }
      return acc;
    }, {} as Record<string, MenuItem[]>);

    Object.keys(grouped).forEach((category) => {
      grouped[category] = sortItems(grouped[category]);
    });

    const targetItems = grouped[targetCategory] || [];
    const targetIndex = targetItems.findIndex((item) => item.id === targetItem.id);
    targetItems.splice(
      targetIndex === -1 ? targetItems.length : targetIndex,
      0,
      {
        ...draggedItem,
        category: targetCategory,
        category_order:
          categoryOrderMap.get(targetCategory) ?? getFallbackCategoryOrder(targetCategory),
      }
    );
    grouped[targetCategory] = targetItems;

    const nextItems = Object.entries(grouped).flatMap(([category, categoryItems]) =>
      categoryItems.map((item, index) => ({
        ...item,
        category,
        category_order: categoryOrderMap.get(category) ?? getFallbackCategoryOrder(category),
        sort_order: index,
      }))
    );

    setItems(nextItems);
    setDragged(null);
    await persistItemOrder(nextItems);
  };

  const filteredItems = items.filter(
    (item) =>
      (normalize(item.name).includes(normalize(search)) ||
        normalize(item.description || "").includes(normalize(search))) &&
      (filterCategory ? item.category === filterCategory : true)
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <main style={{ ...styles.page, ...(isTablet ? styles.pageStack : {}) }}>
      <aside style={{ ...styles.sidebar, ...(isTablet ? styles.sidebarTop : {}) }}>
        <h2 style={styles.sidebarTitle}>Missô Admin</h2>
        <nav style={{ ...styles.nav, ...(isTablet ? styles.navInline : {}) }}>
          <AdminLink href="/admin/menu" pathname={pathname}>
            Cardápio
          </AdminLink>
          <AdminLink href="/admin/faturamento" pathname={pathname}>
            Faturamento
          </AdminLink>
          <AdminLink href="/admin" pathname={pathname}>
            Visão geral
          </AdminLink>
          <AdminLink href="/admin/pedidos" pathname={pathname}>
            Pedidos
          </AdminLink>
          <AdminLink href="/admin/clientes" pathname={pathname}>
            Clientes
          </AdminLink>
          <AdminLink href="/admin/pagamentos" pathname={pathname}>
            Pagamentos
          </AdminLink>
          <AdminLink href="/admin/promocoes" pathname={pathname}>
            Promoções
          </AdminLink>
          <AdminLink href="/admin/configuracoes" pathname={pathname}>
            Configurações
          </AdminLink>
        </nav>
      </aside>

      <section style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
          <div>
            <p style={styles.eyebrow}>Operação</p>
            <h1 style={styles.title}>Cardápio</h1>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            style={styles.primaryButton}
          >
            Adicionar item
          </button>
        </header>

        <section style={{ ...styles.toolbar, ...(isMobile ? styles.toolbarStack : {}) }}>
          <input
            type="text"
            placeholder="Buscar prato..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.input}
          />
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            style={styles.select}
          >
            <option value="">Todas as categorias</option>
            {defaultCategoryOrder.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </section>

        {!canReorder && (
          <p style={styles.notice}>Limpe a busca e o filtro para reorganizar categorias e itens.</p>
        )}
        {savingOrder && <p style={styles.noticeStrong}>Salvando nova ordem...</p>}

        <section style={styles.categoryList}>
          {getOrderedCategories(filteredItems).map((category) => {
            const itemsInCategory = sortItems(groupedItems[category]);

            return (
              <article
                key={category}
                draggable={canReorder}
                onDragStart={() => canReorder && setDragged({ type: "category", category })}
                onDragOver={(event) => canReorder && event.preventDefault()}
                onDrop={() => handleCategoryDrop(category)}
                  style={{
                    ...styles.categoryCard,
                    ...(isMobile ? styles.categoryCardMobile : {}),
                    opacity:
                    dragged?.type === "category" && dragged.category === category ? 0.55 : 1,
                }}
              >
                <div style={{ ...styles.categoryHeader, ...(isMobile ? styles.categoryHeaderMobile : {}) }}>
                  <div style={styles.categoryTitleGroup}>
                    <span style={canReorder ? styles.dragHandle : styles.dragHandleDisabled}>
                      ::
                    </span>
                    <div>
                      <p style={styles.cardEyebrow}>Categoria</p>
                      <h2 style={styles.categoryTitle}>
                        {categoryLabels[category] || category}
                      </h2>
                    </div>
                  </div>
                  <span style={styles.pill}>{itemsInCategory.length} itens</span>
                </div>

                <div style={styles.itemList}>
                  {itemsInCategory.map((item) => (
                    <div
                      key={item.id}
                      draggable={canReorder}
                      onDragStart={(event) => {
                        if (!canReorder) return;
                        event.stopPropagation();
                        setDragged({ type: "item", itemId: item.id });
                      }}
                      onDragOver={(event) => canReorder && event.preventDefault()}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handleItemDrop(item, category);
                      }}
                      style={{
                        ...styles.itemCard,
                        ...(isMobile ? styles.itemCardMobile : {}),
                        opacity: dragged?.type === "item" && dragged.itemId === item.id ? 0.55 : 1,
                      }}
                    >
                      <div style={{ ...styles.itemMain, ...(isMobile ? styles.itemMainMobile : {}) }}>
                        <span style={canReorder ? styles.dragHandle : styles.dragHandleDisabled}>
                          ::
                        </span>
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={92}
                            height={64}
                            style={styles.itemImage}
                          />
                        )}
                        <div>
                          <h3 style={styles.itemName}>{item.name}</h3>
                          <p style={styles.itemPrice}>{money(Number(item.price))}</p>
                          {item.description && (
                            <p style={styles.itemDescription}>{item.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        style={styles.secondaryButton}
                      >
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </section>

      {editingItem && (
        <EditModal
          item={editingItem}
          compact={isTablet}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            if ("deleted" in updated) {
              setItems((current) => current.filter((item) => item.id !== updated.id));
            } else {
              setItems((current) => {
                const exists = current.some((item) => item.id === updated.id);
                return uniqueById(
                  exists
                    ? current.map((item) => (item.id === updated.id ? updated : item))
                    : [updated, ...current]
                );
              });
            }
            setEditingItem(null);
          }}
        />
      )}
    </main>
  );
}

function AdminLink({
  href,
  pathname,
  children,
}: {
  href: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = pathname === href;

  return (
    <Link href={href} style={{ ...styles.navLink, ...(active ? styles.navLinkActive : {}) }}>
      {children}
    </Link>
  );
}

function EditModal({
  item,
  compact,
  onClose,
  onSave,
}: {
  item: EditableMenuItem;
  compact: boolean;
  onClose: () => void;
  onSave: (item: MenuItem | DeletedMenuItem) => void;
}) {
  const [form, setForm] = useState<EditableMenuItem>(item);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNewItem = Boolean(item.isNew);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const canSave =
    form.name.trim().length > 0 &&
    Number(form.price) > 0 &&
    form.category.trim().length > 0 &&
    !uploading &&
    !saving &&
    !deleting;

  const handleImageUpload = async (file: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const filePath = `item-${form.id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (error) {
      toast.error("Erro ao enviar imagem: " + error.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    setForm({ ...form, image: publicUrlData.publicUrl });
    setUploading(false);
    toast.success("Imagem enviada com sucesso.");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("O nome do prato é obrigatório.");
      return;
    }
    if (form.price <= 0) {
      toast.error("O preço deve ser maior que zero.");
      return;
    }
    if (!form.category.trim()) {
      toast.error("A categoria é obrigatória.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        category_order: form.category_order ?? getFallbackCategoryOrder(form.category),
        sort_order: form.sort_order ?? 0,
        description: form.description,
        image: form.image || null,
        active: form.active !== false && form.availability_status !== "inativo",
        availability_status: form.availability_status || "ativo",
      };

      const { data, error } = isNewItem
        ? await supabase.from("menu").insert([payload]).select()
        : await supabase
            .from("menu")
            .update(payload)
            .eq("id", Number(form.id))
            .select();

      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      if (data && data.length > 0) {
        onSave(data[0] as MenuItem);
        toast.success(isNewItem ? "Item criado." : "Item atualizado.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewItem) {
      onClose();
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase.from("menu").delete().eq("id", Number(form.id));

      if (error) {
        toast.error("Erro ao excluir: " + error.message);
        return;
      }

      onSave({ ...form, deleted: true });
      toast.success("Item excluído.");
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, ...(compact ? styles.modalCompact : {}) }}>
        <div style={{ ...styles.modalHeader, ...(compact ? styles.modalHeaderCompact : {}) }}>
          <div>
            <p style={styles.cardEyebrow}>Cardápio</p>
            <h2 style={styles.modalTitle}>{isNewItem ? "Adicionar item" : "Editar item"}</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            Fechar
          </button>
        </div>

        <div style={{ ...styles.modalBody, ...(compact ? styles.modalBodyCompact : {}) }}>
          <section style={styles.modalPanel}>
            <label style={styles.field}>
              <span style={styles.label}>Nome do prato</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({ ...form, name: event.target.value });
                }}
                placeholder="Ex: Hot philadelphia"
                style={styles.input}
              />
            </label>

            <div style={{ ...styles.formGrid, ...(compact ? styles.formGridCompact : {}) }}>
              <label style={styles.field}>
                <span style={styles.label}>Preço</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => {
                    setConfirmDelete(false);
                    setForm({ ...form, price: Number(event.target.value) });
                  }}
                  placeholder="Preço"
                  style={styles.input}
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Categoria</span>
                <select
                  value={form.category}
                  onChange={(event) => {
                    const category = event.target.value;
                    setConfirmDelete(false);
                    setForm({
                      ...form,
                      category,
                      category_order: getFallbackCategoryOrder(category),
                    });
                  }}
                  style={styles.select}
                >
                  {defaultCategoryOrder.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Disponibilidade</span>
                <select
                  value={form.availability_status || (form.active === false ? "inativo" : "ativo")}
                  onChange={(event) => {
                    const availability_status = event.target.value;
                    setConfirmDelete(false);
                    setForm({
                      ...form,
                      availability_status,
                      active: availability_status !== "inativo",
                    });
                  }}
                  style={styles.select}
                >
                  <option value="ativo">Ativo</option>
                  <option value="esgotado">Esgotado</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>

            <label style={styles.field}>
              <span style={styles.label}>Descrição</span>
              <textarea
                value={form.description || ""}
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({ ...form, description: event.target.value });
                }}
                placeholder="Detalhe ingredientes, porções ou observações importantes."
                style={styles.textarea}
              />
            </label>

            <div style={styles.pricePreview}>
              <span>Prévia do preço</span>
              <strong>{money(Number(form.price || 0))}</strong>
            </div>
          </section>

          <aside style={styles.imagePanel}>
            <div>
              <p style={styles.cardEyebrow}>Imagem</p>
              <h3 style={styles.imageTitle}>Foto do item</h3>
            </div>

            <label style={styles.uploadCard}>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setConfirmDelete(false);
                    handleImageUpload(file);
                  }
                }}
                style={styles.fileInput}
              />
              {preview ? (
                <Image
                  src={preview}
                  alt="Prévia"
                  width={520}
                  height={320}
                  unoptimized
                  style={styles.previewImage}
                />
              ) : form.image ? (
                <Image
                  src={form.image}
                  alt="Imagem atual"
                  width={520}
                  height={320}
                  style={styles.previewImage}
                />
              ) : (
                <span style={styles.uploadPlaceholder}>Selecionar imagem</span>
              )}
            </label>

            {uploading ? (
              <p style={styles.noticeStrong}>Enviando imagem...</p>
            ) : (
              <p style={styles.imageHint}>
                Clique na área da foto para trocar a imagem do cardápio.
              </p>
            )}
          </aside>
        </div>

        <div style={{ ...styles.modalActions, ...(compact ? styles.modalActionsCompact : {}) }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || uploading || deleting}
            style={{
              ...styles.deleteButton,
              ...(confirmDelete ? styles.deleteButtonConfirm : {}),
            }}
          >
            {isNewItem
              ? "Cancelar"
              : deleting
              ? "Excluindo..."
              : confirmDelete
              ? "Confirmar exclusão"
              : "Excluir"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...styles.primaryButton,
              ...(!canSave ? styles.primaryButtonDisabled : {}),
            }}
          >
            {saving ? "Salvando..." : isNewItem ? "Criar item" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f4ef",
    color: "#1c1a17",
    display: "grid",
    gridTemplateColumns: "240px minmax(0, 1fr)",
  },
  pageStack: {
    gridTemplateColumns: "1fr",
  },
  sidebar: {
    borderRight: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#fffdf8",
    padding: 22,
  },
  sidebarTop: {
    borderRight: "none",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
  },
  sidebarTitle: {
    fontSize: 20,
    marginBottom: 22,
  },
  nav: {
    display: "grid",
    gap: 8,
  },
  navInline: {
    display: "flex",
    flexWrap: "wrap",
  },
  navLink: {
    color: "#514a43",
    textDecoration: "none",
    borderRadius: 8,
    padding: "12px 14px",
    fontWeight: 850,
  },
  navLinkActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  content: {
    padding: "28px 24px 56px",
  },
  contentMobile: {
    padding: "22px 14px 42px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
    marginBottom: 18,
  },
  headerMobile: {
    display: "grid",
    alignItems: "start",
  },
  eyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: "clamp(36px, 5vw, 58px)",
    lineHeight: 1,
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
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 280px)",
    gap: 10,
    marginBottom: 12,
  },
  toolbarStack: {
    gridTemplateColumns: "1fr",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
    outlineColor: "#9f1d2f",
  },
  select: {
    width: "100%",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    background: "#fffdf8",
    color: "#1c1a17",
  },
  notice: {
    color: "#625b53",
    margin: "8px 0 14px",
  },
  noticeStrong: {
    color: "#9f1d2f",
    margin: "8px 0 14px",
    fontWeight: 850,
  },
  categoryList: {
    display: "grid",
    gap: 16,
  },
  categoryCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 14px 35px rgba(28, 26, 23, 0.05)",
  },
  categoryCardMobile: {
    padding: 14,
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 14,
  },
  categoryHeaderMobile: {
    display: "grid",
  },
  categoryTitleGroup: {
    display: "flex",
    gap: 12,
    alignItems: "start",
  },
  dragHandle: {
    color: "#9f1d2f",
    cursor: "grab",
    fontWeight: 850,
    lineHeight: 1.2,
  },
  dragHandleDisabled: {
    color: "#d8d0c4",
    fontWeight: 850,
    lineHeight: 1.2,
  },
  cardEyebrow: {
    color: "#9f1d2f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  categoryTitle: {
    marginTop: 3,
    fontSize: 24,
  },
  pill: {
    borderRadius: 999,
    background: "#f0ebe2",
    padding: "7px 10px",
    color: "#625b53",
    fontSize: 13,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  itemList: {
    display: "grid",
    gap: 10,
  },
  itemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 8,
    padding: 12,
    background: "#fff",
  },
  itemCardMobile: {
    display: "grid",
    alignItems: "start",
  },
  itemMain: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  itemMainMobile: {
    alignItems: "flex-start",
  },
  itemImage: {
    borderRadius: 8,
    objectFit: "cover",
    background: "#f0ebe2",
  },
  itemName: {
    fontSize: 17,
    lineHeight: 1.25,
  },
  itemPrice: {
    color: "#625b53",
    marginTop: 4,
    fontWeight: 850,
  },
  itemDescription: {
    color: "#766e64",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 1.35,
  },
  secondaryButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#fffdf8",
    color: "#1c1a17",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    background: "rgba(28, 26, 23, 0.46)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  modal: {
    width: "min(920px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#fffdf8",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.22)",
  },
  modalCompact: {
    width: "min(680px, 100%)",
    padding: 18,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 16,
  },
  modalHeaderCompact: {
    display: "grid",
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 28,
  },
  closeButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#f7f4ef",
    color: "#1c1a17",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 850,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 180px) minmax(0, 1fr)",
    gap: 10,
  },
  formGridCompact: {
    gridTemplateColumns: "1fr",
  },
  modalBody: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 330px)",
    gap: 18,
    alignItems: "start",
  },
  modalBodyCompact: {
    gridTemplateColumns: "1fr",
  },
  modalPanel: {
    display: "grid",
    gap: 13,
    minWidth: 0,
  },
  field: {
    display: "grid",
    gap: 7,
  },
  label: {
    color: "#514a43",
    fontSize: 13,
    fontWeight: 850,
  },
  textarea: {
    width: "100%",
    minHeight: 124,
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: 8,
    padding: 12,
    resize: "vertical",
    background: "#fffdf8",
    outlineColor: "#9f1d2f",
  },
  pricePreview: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "12px 14px",
    fontWeight: 850,
  },
  imagePanel: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },
  imageTitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 1.15,
  },
  uploadCard: {
    position: "relative",
    minHeight: 250,
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
    height: 250,
    objectFit: "cover",
    background: "#f0ebe2",
  },
  imageHint: {
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.4,
  },
  modalActions: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
  },
  modalActionsCompact: {
    display: "grid",
  },
  deleteButton: {
    border: "1px solid rgba(153, 27, 27, 0.16)",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 850,
  },
  deleteButtonConfirm: {
    background: "#991b1b",
    color: "#fff",
  },
};
