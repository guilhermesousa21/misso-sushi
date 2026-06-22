"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import {
  defaultMenuCategories,
  getCategoryLabel,
  getCategoryOrder,
  normalizeCategorySlug,
  sortCategories,
  type MenuCategory,
} from "../../../lib/menuCategories";
import {
  defaultCheckoutAddons,
  type CheckoutAddonConfig,
} from "../../../lib/orderFeatures";
import { supabase } from "../../../lib/supabase";
import { useIsMobile, useIsTablet } from "../../../lib/useMediaQuery";
import { MenuItem } from "../../../types";
import { getButtonStyle, getInputStyle, getSelectStyle, eyebrowStyle } from "../../../lib/uiStyles";
import {
  readAdminMenuUiDraft,
  writeAdminMenuUiDraft,
} from "../../../lib/adminUiDraft";
import { AdminShell, adminStyles as baseStyles } from "../AdminShell";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";

type EditableMenuItem = MenuItem & { isNew?: boolean };
type DeletedMenuItem = MenuItem & { deleted: true };
type DragState =
  | { type: "category"; category: string }
  | { type: "item"; itemId: number };

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatBrDecimal = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseBrDecimal = (value: string) => {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const sanitizePriceDraft = (value: string) => value.replace(/[^\d,]/g, "");

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const sortItems = (menuItems: MenuItem[]) =>
  [...menuItems].sort((a, b) => {
    const aOrder =
      typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "pt-BR");
  });

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

const getOrderedCategorySlugs = (
  menuItems: MenuItem[],
  categories: MenuCategory[],
  includeEmpty = true
) => {
  const slugsWithItems = new Set(menuItems.map((item) => item.category));
  const categorySlugs = sortCategories(categories)
    .filter((category) => includeEmpty || slugsWithItems.has(category.slug))
    .map((category) => category.slug);
  const unknownSlugs = Array.from(slugsWithItems).filter(
    (slug) => !categorySlugs.includes(slug)
  );

  return [...categorySlugs, ...unknownSlugs].sort(
    (a, b) => getCategoryOrder(a, categories) - getCategoryOrder(b, categories)
  );
};

const isMissingColumnError = (error?: { code?: string; message?: string } | null) =>
  error?.code === "PGRST204" ||
  error?.code === "42703" ||
  Boolean(error?.message?.includes("schema cache"));

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>(defaultMenuCategories);
  const [checkoutAddons, setCheckoutAddons] = useState<CheckoutAddonConfig[]>(defaultCheckoutAddons);
  const [storeSettingsId, setStoreSettingsId] = useState<number | undefined>();
  const [savingAddons, setSavingAddons] = useState(false);
  const [addonPriceDrafts, setAddonPriceDrafts] = useState<Record<string, string>>({});
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [creatingCategoryModalOpen, setCreatingCategoryModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [editingItem, setEditingItem] = useState<EditableMenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [dragged, setDragged] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DragState | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [menuUiReady, setMenuUiReady] = useState(false);
  const canReorder = !search.trim() && !filterCategory;
  const forceExpandedCategories = Boolean(search.trim() || filterCategory);
  const clearDragState = () => {
    setDragged(null);
    setDropTarget(null);
  };
  const getCategoryDropTargetFromPoint = (event: PointerEvent<HTMLElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    return element
      ?.closest<HTMLElement>("[data-category-drop-target]")
      ?.dataset.categoryDropTarget;
  };

  useEffect(() => {
    const draft = readAdminMenuUiDraft();
    if (draft.search) setSearch(draft.search);
    if (draft.filterCategory) setFilterCategory(draft.filterCategory);
    if (draft.expandedCategories.length > 0) {
      setExpandedCategories(new Set(draft.expandedCategories));
    }
    setMenuUiReady(true);
  }, []);

  useEffect(() => {
    if (!menuUiReady) return;

    const timer = window.setTimeout(() => {
      writeAdminMenuUiDraft({
        search,
        filterCategory,
        expandedCategories: Array.from(expandedCategories),
      });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [menuUiReady, search, filterCategory, expandedCategories]);

  useEffect(() => {
    async function fetchMenuData() {
      const [
        { data: menuData, error: menuError },
        { data: categoryData },
        { data: settingsData },
      ] = await Promise.all([
        supabase
          .from("menu")
          .select("*")
          .order("category", { ascending: true })
          .order("name", { ascending: true }),
        supabase.from("menu_categories").select("*").order("sort_order", { ascending: true }),
        supabase.from("store_settings").select("id,checkout_addons").limit(1).maybeSingle(),
      ]);

      const nextCategories = categoryData?.length
        ? sortCategories(categoryData as MenuCategory[])
        : defaultMenuCategories;
      setCategories(nextCategories);

      if (settingsData) {
        setStoreSettingsId(settingsData.id);
        setCheckoutAddons(
          settingsData.checkout_addons?.length
            ? settingsData.checkout_addons
            : defaultCheckoutAddons
        );
      }

      if (!menuError && menuData) {
        const nextItems = uniqueById(menuData as MenuItem[]);
        setItems(nextItems);
      }
    }

    fetchMenuData();
  }, []);

  const handleAddItem = (categorySlug?: string) => {
    const fallbackCategory =
      sortCategories(categories).find((category) => category.active) || categories[0];
    const nextCategorySlug = categorySlug || fallbackCategory?.slug || "entradas";
    setExpandedCategories((current) => new Set(current).add(nextCategorySlug));

    setEditingItem({
      id: 0,
      name: "",
      price: 0,
      category: nextCategorySlug,
      category_order: getCategoryOrder(nextCategorySlug, categories),
      sort_order: items.filter((item) => item.category === nextCategorySlug).length,
      description: "",
      active: true,
      availability_status: "ativo",
      isNew: true,
    });
  };

  const toggleCategoryExpanded = (categorySlug: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categorySlug)) {
        next.delete(categorySlug);
      } else {
        next.add(categorySlug);
      }
      return next;
    });
  };

  const persistCategoryOrder = async (orderedCategories: string[]) => {
    setSavingOrder(true);

    const updates = await Promise.all(
      orderedCategories.flatMap((category, index) => [
        supabase
          .from("menu_categories")
          .update({ sort_order: index })
          .eq("slug", category),
        supabase
          .from("menu")
          .update({ category_order: index })
          .eq("category", category),
      ])
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
            category_order: item.category_order ?? getCategoryOrder(item.category, categories),
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
      setDropTarget(null);
      return;
    }

    const orderedCategorySlugs = getOrderedCategorySlugs(items, categories);
    const fromIndex = orderedCategorySlugs.indexOf(dragged.category);
    const toIndex = orderedCategorySlugs.indexOf(targetCategory);
    if (fromIndex === -1 || toIndex === -1) {
      setDragged(null);
      setDropTarget(null);
      return;
    }

    const nextCategories = moveValue(orderedCategorySlugs, fromIndex, toIndex);
    const nextCategoryRows = categories.map((category) => ({
      ...category,
      sort_order: nextCategories.indexOf(category.slug),
    }));
    const categoryOrderMap = new Map(nextCategories.map((category, index) => [category, index]));
    const nextItems = items.map((item) => ({
      ...item,
      category_order: categoryOrderMap.get(item.category) ?? item.category_order,
    }));

    setCategories(sortCategories(nextCategoryRows));
    setItems(nextItems);
    setDragged(null);
    setDropTarget(null);
    await persistCategoryOrder(nextCategories);
  };

  const getItemsAfterItemDrop = (
    draggedItem: MenuItem,
    targetCategory: string,
    targetItemId?: number,
    insertAfterTarget = false
  ) => {
    const orderedCategorySlugs = getOrderedCategorySlugs(items, categories);
    const categoryOrderMap = new Map(orderedCategorySlugs.map((category, index) => [category, index]));
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
    const targetIndex =
      typeof targetItemId === "number"
        ? targetItems.findIndex((item) => item.id === targetItemId)
        : -1;
    const insertIndex =
      targetIndex === -1
        ? targetItems.length
        : insertAfterTarget
          ? targetIndex + 1
          : targetIndex;
    targetItems.splice(
      insertIndex,
      0,
      {
        ...draggedItem,
        category: targetCategory,
        category_order:
          categoryOrderMap.get(targetCategory) ?? getCategoryOrder(targetCategory, categories),
      }
    );
    grouped[targetCategory] = targetItems;

    return Object.entries(grouped).flatMap(([category, categoryItems]) =>
      categoryItems.map((item, index) => ({
        ...item,
        category,
        category_order: categoryOrderMap.get(category) ?? getCategoryOrder(category, categories),
        sort_order: index,
      }))
    );
  };

  const persistDroppedItems = async (nextItems: MenuItem[]) => {
    setItems(nextItems);
    clearDragState();
    await persistItemOrder(nextItems);
  };

  const handleItemDrop = async (targetItem: MenuItem, targetCategory: string) => {
    if (!canReorder || dragged?.type !== "item" || dragged.itemId === targetItem.id) {
      setDragged(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = items.find((item) => item.id === dragged.itemId);
    if (!draggedItem) {
      setDragged(null);
      setDropTarget(null);
      return;
    }

    const sameCategoryItems = sortItems(items.filter((item) => item.category === targetCategory));
    const draggedIndex = sameCategoryItems.findIndex((item) => item.id === draggedItem.id);
    const targetIndex = sameCategoryItems.findIndex((item) => item.id === targetItem.id);
    const shouldInsertAfterTarget =
      draggedItem.category === targetCategory &&
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex < targetIndex;

    await persistDroppedItems(
      getItemsAfterItemDrop(
        draggedItem,
        targetCategory,
        targetItem.id,
        shouldInsertAfterTarget
      )
    );
  };

  const handleItemDropToCategory = async (targetCategory: string) => {
    if (!canReorder || dragged?.type !== "item") {
      setDragged(null);
      setDropTarget(null);
      return;
    }

    const draggedItem = items.find((item) => item.id === dragged.itemId);
    if (!draggedItem) {
      setDragged(null);
      setDropTarget(null);
      return;
    }

    await persistDroppedItems(getItemsAfterItemDrop(draggedItem, targetCategory));
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalize(search);

    return items.filter(
      (item) =>
        (normalize(item.name).includes(normalizedSearch) ||
          normalize(item.description || "").includes(normalizedSearch)) &&
        (filterCategory ? item.category === filterCategory : true)
    );
  }, [filterCategory, items, search]);

  const groupedItems = useMemo(
    () =>
      filteredItems.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, MenuItem[]>),
    [filteredItems]
  );

  const orderedCategories = useMemo(
    () => getOrderedCategorySlugs(filteredItems, categories, !filterCategory),
    [categories, filterCategory, filteredItems]
  );

  const categoryOptions = useMemo(() => sortCategories(categories), [categories]);

  const itemCountByCategory = useMemo(
    () =>
      items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [items]
  );
  const toggleItemActive = async (item: MenuItem) => {
    const nextActive = item.active === false || item.availability_status === "inativo";
    const payload = {
      active: nextActive,
      availability_status: nextActive ? "ativo" : "inativo",
    };

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, ...payload } : currentItem
      )
    );

    const { error } = await supabase
      .from("menu")
      .update(payload)
      .eq("id", Number(item.id));

    if (error) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem
        )
      );
      toast.error("Não foi possível alterar o status do item.");
      return;
    }

    toast.success(nextActive ? "Item ativado." : "Item pausado.");
  };

  const saveCheckoutAddons = async () => {
    setSavingAddons(true);
    const payload = { checkout_addons: checkoutAddons };

    const query = storeSettingsId
      ? supabase.from("store_settings").update(payload).eq("id", storeSettingsId).select()
      : supabase.from("store_settings").insert([payload]).select();

    const result = await query;

    if (isMissingColumnError(result.error)) {
      toast.error("Coluna checkout_addons não encontrada. Rode o SQL de atualização no Supabase.");
      setSavingAddons(false);
      return;
    }

    if (result.error) {
      toast.error("Não foi possível salvar os complementos.");
      setSavingAddons(false);
      return;
    }

    if (result.data?.[0]) {
      setStoreSettingsId(result.data[0].id);
      setCheckoutAddons(
        result.data[0].checkout_addons?.length
          ? result.data[0].checkout_addons
          : defaultCheckoutAddons
      );
    }

    setSavingAddons(false);
    toast.success("Complementos salvos.");
  };

  const modalOpen = Boolean(editingCategory || creatingCategoryModalOpen || editingItem);

  const headerActions = (
    <div style={{ ...styles.headerActions, ...(isMobile ? styles.headerActionsMobile : {}) }}>
      <Button type="button" onClick={() => handleAddItem()} style={isMobile ? styles.headerButtonMobile : undefined}>
        <Plus size={16} strokeWidth={2.5} />
        {isMobile ? "Item" : "Novo item"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setCreatingCategoryModalOpen(true)} style={isMobile ? styles.headerButtonMobile : undefined}>
        <FolderPlus size={16} strokeWidth={2.2} />
        {isMobile ? "Categoria" : "Nova categoria"}
      </Button>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <AdminShell
        eyebrow="Operação"
        title="Cardápio"
        action={headerActions}
        hideMobileNav={modalOpen}
      >

        <section style={{ ...styles.toolbar, ...(isMobile ? styles.toolbarStack : {}) }}>
          <label style={styles.searchWrap}>
            <Search size={15} strokeWidth={2.2} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar prato..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ ...styles.input, ...(isMobile ? styles.controlMobile : {}) }}
            />
          </label>
          <Select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            containerStyle={isMobile ? styles.controlMobile : undefined}
            style={styles.select}
          >
            <option value="">Todas as categorias</option>
            {categoryOptions.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </section>
        {(search.trim() || filterCategory) && (
          <div style={{ ...styles.activeFilterBar, ...(isMobile ? styles.activeFilterBarMobile : {}) }}>
            <span>
              Mostrando resultados filtrados
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterCategory("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}

        {!canReorder && (
          <p style={styles.notice}>Limpe a busca e o filtro para reorganizar categorias e itens.</p>
        )}
        {dragged && !savingOrder && (
          <p style={styles.noticeStrong}>Solte no novo lugar para salvar a ordem.</p>
        )}
        {savingOrder && <p style={styles.noticeStrong}>Ordem alterada. Salvando...</p>}

        <section style={{ ...styles.categoryList, ...(isMobile ? styles.categoryListMobile : {}) }}>
          {orderedCategories.map((category) => {
            const itemsInCategory = sortItems(groupedItems[category] || []);
            const categoryRecord = categories.find((item) => item.slug === category);
            const categoryActive = categoryRecord?.active !== false;
            const editableCategory: MenuCategory =
              categoryRecord ?? {
                slug: category,
                name: getCategoryLabel(category, categories),
                sort_order: getCategoryOrder(category, categories),
                active: categoryActive,
              };
            const categoryExpanded =
              forceExpandedCategories || expandedCategories.has(category);

            return (
              <article
                key={category}
                data-category-drop-target={category}
                draggable={false}
                onDragEnter={() =>
                  canReorder && setDropTarget({ type: "category", category })
                }
                onDragOver={(event) => canReorder && event.preventDefault()}
                onDrop={() => {
                  if (dragged?.type === "item") {
                    void handleItemDropToCategory(category);
                    return;
                  }
                  void handleCategoryDrop(category);
                }}
                  style={{
                    ...styles.categoryCard,
                    ...(isMobile ? styles.categoryCardMobile : {}),
                    ...(dropTarget?.type === "category" &&
                    dropTarget.category === category &&
                    dragged?.type === "category" &&
                    dragged.category !== category
                      ? styles.dragDropTarget
                      : {}),
                    ...(dragged?.type === "category" && dragged.category === category
                      ? styles.draggingRow
                      : {}),
                    opacity:
                    dragged?.type === "category" && dragged.category === category ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    ...styles.categoryHeader,
                    ...(isMobile ? styles.categoryHeaderMobile : {}),
                    ...(!categoryExpanded ? styles.categoryHeaderClosed : {}),
                  }}
                >
                  <div
                    style={{
                      ...styles.categoryTitleGroup,
                      ...(isMobile ? styles.categoryTitleGroupMobile : {}),
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpanded(category)}
                      aria-expanded={categoryExpanded}
                      aria-label={`${categoryExpanded ? "Fechar" : "Abrir"} ${getCategoryLabel(category, categories)}`}
                      style={{
                        ...styles.categoryToggle,
                        ...(isMobile ? styles.categoryToggleMobile : {}),
                      }}
                    >
                      {categoryExpanded ? (
                        <ChevronUp size={18} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={18} strokeWidth={2.5} />
                      )}
                    </button>
                    <div style={styles.categoryTitleText}>
                      <h2 style={{ ...styles.categoryTitle, ...(isMobile ? styles.categoryTitleMobile : {}) }}>
                        {getCategoryLabel(category, categories)}
                      </h2>
                      <p style={styles.categoryMeta}>
                        {categoryActive
                          ? `${itemsInCategory.length} ${itemsInCategory.length === 1 ? "item" : "itens"}`
                          : "Categoria pausada"}
                      </p>
                    </div>
                    {isMobile && (
                      <span
                        onPointerDown={(event) => {
                          if (!canReorder) return;
                          event.preventDefault();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          flushSync(() => {
                            setDragged({ type: "category", category });
                            setDropTarget({ type: "category", category });
                          });
                        }}
                        onPointerMove={(event) => {
                          if (dragged?.type !== "category" || dragged.category !== category) {
                            return;
                          }
                          const targetCategory = getCategoryDropTargetFromPoint(event);
                          if (targetCategory) {
                            setDropTarget({ type: "category", category: targetCategory });
                          }
                        }}
                        onPointerUp={(event) => {
                          if (dragged?.type !== "category" || dragged.category !== category) {
                            clearDragState();
                            return;
                          }
                          const targetCategory =
                            getCategoryDropTargetFromPoint(event) ||
                            (dropTarget?.type === "category" ? dropTarget.category : null);
                          if (targetCategory && targetCategory !== category) {
                            void handleCategoryDrop(targetCategory);
                            return;
                          }
                          clearDragState();
                        }}
                        onPointerCancel={clearDragState}
                        title="Arrastar categoria"
                        aria-label="Arrastar categoria"
                        style={{
                          ...(canReorder ? styles.categoryDragHandle : styles.categoryDragHandleDisabled),
                          ...styles.categoryDragHandleMobile,
                        }}
                      >
                        <GripVertical size={18} strokeWidth={2.4} />
                      </span>
                    )}
                  </div>
                  <div style={{ ...styles.categoryHeaderActions, ...(isMobile ? styles.categoryHeaderActionsMobile : {}) }}>
                    {!isMobile && (
                    <span
                      onPointerDown={(event) => {
                        if (!canReorder) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        flushSync(() => {
                          setDragged({ type: "category", category });
                          setDropTarget({ type: "category", category });
                        });
                      }}
                      onPointerMove={(event) => {
                        if (dragged?.type !== "category" || dragged.category !== category) {
                          return;
                        }
                        const targetCategory = getCategoryDropTargetFromPoint(event);
                        if (targetCategory) {
                          setDropTarget({ type: "category", category: targetCategory });
                        }
                      }}
                      onPointerUp={(event) => {
                        if (dragged?.type !== "category" || dragged.category !== category) {
                          clearDragState();
                          return;
                        }
                        const targetCategory =
                          getCategoryDropTargetFromPoint(event) ||
                          (dropTarget?.type === "category" ? dropTarget.category : null);
                        if (targetCategory && targetCategory !== category) {
                          void handleCategoryDrop(targetCategory);
                          return;
                        }
                        clearDragState();
                      }}
                      onPointerCancel={clearDragState}
                      title="Arrastar categoria"
                      style={canReorder ? styles.categoryDragHandle : styles.categoryDragHandleDisabled}
                    >
                      <GripVertical size={18} strokeWidth={2.4} />
                    </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddItem(category)}
                      style={{
                        ...styles.categoryActionButton,
                        ...(isMobile ? styles.categoryActionButtonMobile : {}),
                      }}
                    >
                      + Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(editableCategory)}
                      style={{
                        ...styles.categoryActionButton,
                        ...(isMobile ? styles.categoryActionButtonMobile : {}),
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </div>

                {categoryExpanded && (
                  <div style={{ ...styles.itemList, ...(isMobile ? styles.itemListMobile : {}) }}>
                    {itemsInCategory.length === 0 && (
                      <p style={styles.emptyCategoryText}>Nenhum item nesta categoria.</p>
                    )}
                    {itemsInCategory.map((item) => (
                    (() => {
                      const itemActive =
                        item.active !== false &&
                        item.availability_status !== "inativo" &&
                        item.availability_status !== "esgotado";

                      return (
                    <div
                      key={item.id}
                      draggable={canReorder}
                      onDragStart={(event) => {
                        if (!canReorder) {
                          event.preventDefault();
                          return;
                        }
                        event.dataTransfer.effectAllowed = "move";
                        event.stopPropagation();
                        setDragged({ type: "item", itemId: item.id });
                      }}
                      onDragEnd={clearDragState}
                      onDragEnter={(event) => {
                        event.stopPropagation();
                        if (!canReorder) return;
                        if (dragged?.type === "category") {
                          setDropTarget({ type: "category", category });
                          return;
                        }
                        setDropTarget({ type: "item", itemId: item.id });
                      }}
                      onDragOver={(event) => {
                        if (!canReorder) return;
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.stopPropagation();
                        if (dragged?.type === "category") {
                          void handleCategoryDrop(category);
                          return;
                        }
                        handleItemDrop(item, category);
                      }}
                      style={{
                        ...styles.itemCard,
                        ...(isMobile ? styles.itemCardMobile : {}),
                        ...(!itemActive ? styles.itemCardPaused : {}),
                        ...(dropTarget?.type === "item" &&
                        dropTarget.itemId === item.id &&
                        dragged?.type === "item" &&
                        dragged.itemId !== item.id
                          ? styles.dragDropTarget
                          : {}),
                        ...(dragged?.type === "item" && dragged.itemId === item.id
                          ? styles.draggingRow
                          : {}),
                        opacity: dragged?.type === "item" && dragged.itemId === item.id ? 0.55 : 1,
                      }}
                    >
                      <div style={{ ...styles.itemMain, ...(isMobile ? styles.itemMainMobile : {}) }}>
                        <span
                          style={{
                            ...(canReorder ? styles.dragHandle : styles.dragHandleDisabled),
                            ...(isMobile ? styles.itemDragHandleMobile : {}),
                          }}
                        >
                          <GripVertical size={isMobile ? 17 : 18} strokeWidth={2.4} />
                        </span>
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={92}
                            height={64}
                            style={{ ...styles.itemImage, ...(isMobile ? styles.itemImageMobile : {}) }}
                          />
                        )}
                        {!item.image && (
                          <div style={{ ...styles.itemImagePlaceholder, ...(isMobile ? styles.itemImageMobile : {}) }}>
                            <span>Sem foto</span>
                          </div>
                        )}
                        <div style={styles.itemText}>
                          <h3 style={{ ...styles.itemName, ...(isMobile ? styles.itemNameMobile : {}) }}>{item.name}</h3>
                          <p style={styles.itemPrice}>{money(Number(item.price))}</p>
                          <div style={styles.itemStatusLine}>
                            {!itemActive && <Badge variant="error">Pausado</Badge>}
                          </div>
                          {item.description && (
                            <p style={{ ...styles.itemDescription, ...(isMobile ? styles.itemDescriptionMobile : {}) }}>{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ ...styles.itemActions, ...(isMobile ? styles.itemActionsMobile : {}) }}>
                        {isMobile ? (
                          <>
                            <div style={styles.itemActionsLeftMobile}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleItemActive(item);
                                }}
                                aria-pressed={itemActive}
                                style={{
                                  ...styles.itemSwitch,
                                  ...(itemActive ? styles.itemSwitchActive : styles.itemSwitchPaused),
                                }}
                                aria-label={itemActive ? "Pausar item" : "Ativar item"}
                              >
                                <span
                                  style={{
                                    ...styles.itemSwitchThumb,
                                    ...(itemActive ? styles.itemSwitchThumbActive : {}),
                                  }}
                                />
                              </button>
                              <span style={styles.itemSwitchLabel}>
                                {itemActive ? "Ativo" : "Pausado"}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingItem(item)}
                              style={styles.secondaryButtonMobile}
                            >
                              <Pencil size={14} strokeWidth={2.2} />
                              Editar
                            </Button>
                          </>
                        ) : (
                          <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleItemActive(item);
                          }}
                          aria-pressed={itemActive}
                          style={{
                            ...styles.itemSwitch,
                            ...(itemActive ? styles.itemSwitchActive : styles.itemSwitchPaused),
                          }}
                          aria-label={itemActive ? "Pausar item" : "Ativar item"}
                        >
                          <span
                            style={{
                              ...styles.itemSwitchThumb,
                              ...(itemActive ? styles.itemSwitchThumbActive : {}),
                            }}
                          />
                        </button>
                        <span style={styles.itemSwitchLabel}>
                          {itemActive ? "Ativo" : "Pausado"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil size={14} strokeWidth={2.2} />
                          Editar
                        </Button>
                          </>
                        )}
                      </div>
                    </div>
                      );
                    })()
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section style={{ ...baseStyles.card, ...styles.addonsCard, ...(isMobile ? styles.addonsCardMobile : {}) }}>
          <div style={styles.addonsHeader}>
            <div>
              <p style={baseStyles.cardEyebrow}>Checkout</p>
              <h2 style={baseStyles.cardTitle}>Complementos</h2>
              <p style={styles.addonsHint}>
                Itens extras que o cliente pode adicionar no checkout (ex.: hashi, shoyu).
              </p>
            </div>
          </div>

          {checkoutAddons.length === 0 ? (
            <div style={styles.addonEmpty}>
              <p style={styles.addonEmptyTitle}>Nenhum complemento cadastrado</p>
              <p style={styles.addonEmptyText}>
                Adicione itens como hashi, shoyu extra ou gengibre para o cliente escolher no checkout.
              </p>
            </div>
          ) : (
            <>
              {!isMobile && (
                <div style={styles.addonTableHead}>
                  <span>Nome</span>
                  <span>Preço</span>
                  <span>Status</span>
                  <span aria-hidden="true" />
                </div>
              )}
              <div style={styles.addonList}>
                {checkoutAddons.map((addon, index) => {
                  const addonActive = addon.active !== false;
                  const priceKey = addon.id || String(index);
                  const priceValue =
                    priceKey in addonPriceDrafts
                      ? addonPriceDrafts[priceKey]
                      : formatBrDecimal(Number(addon.unit_price || 0));

                  return (
                    <div key={addon.id || index} style={{ ...styles.addonRow, ...(isMobile ? styles.addonRowMobile : {}) }}>
                      <label style={styles.addonField}>
                        {isMobile && <span style={styles.addonLabel}>Nome</span>}
                        <input
                          value={addon.name}
                          onChange={(event) => {
                            const next = [...checkoutAddons];
                            next[index] = { ...addon, name: event.target.value };
                            setCheckoutAddons(next);
                          }}
                          placeholder="Ex.: Hashi"
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.addonField}>
                        {isMobile && <span style={styles.addonLabel}>Preço</span>}
                        <div style={styles.addonPriceWrap}>
                          <span style={styles.addonPricePrefix}>R$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={priceValue}
                            onFocus={() => {
                              if (priceKey in addonPriceDrafts) return;
                              setAddonPriceDrafts((prev) => ({
                                ...prev,
                                [priceKey]: formatBrDecimal(Number(addon.unit_price || 0)),
                              }));
                            }}
                            onChange={(event) => {
                              const draft = sanitizePriceDraft(event.target.value);
                              setAddonPriceDrafts((prev) => ({ ...prev, [priceKey]: draft }));
                            }}
                            onBlur={() => {
                              const draft = addonPriceDrafts[priceKey];
                              if (draft === undefined) return;
                              const next = [...checkoutAddons];
                              next[index] = { ...addon, unit_price: parseBrDecimal(draft) };
                              setCheckoutAddons(next);
                              setAddonPriceDrafts((prev) => {
                                const next = { ...prev };
                                delete next[priceKey];
                                return next;
                              });
                            }}
                            style={styles.addonPriceInput}
                            aria-label={`Preço de ${addon.name || "complemento"}`}
                          />
                        </div>
                      </label>
                      <div style={styles.addonStatusCell}>
                        {isMobile && <span style={styles.addonLabel}>Status</span>}
                        <div style={styles.addonStatusControls}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={addonActive}
                            aria-label={`${addonActive ? "Desativar" : "Ativar"} ${addon.name || "complemento"}`}
                            onClick={() => {
                              const next = [...checkoutAddons];
                              next[index] = { ...addon, active: !addonActive };
                              setCheckoutAddons(next);
                            }}
                            style={{
                              ...styles.itemSwitch,
                              ...(addonActive ? styles.itemSwitchActive : styles.itemSwitchPaused),
                            }}
                          >
                            <span
                              style={{
                                ...styles.itemSwitchThumb,
                                ...(addonActive ? styles.itemSwitchThumbActive : {}),
                              }}
                            />
                          </button>
                          <span style={styles.itemSwitchLabel}>{addonActive ? "Ativo" : "Pausado"}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCheckoutAddons(checkoutAddons.filter((_, itemIndex) => itemIndex !== index))
                        }
                        style={styles.addonRemoveButton}
                        aria-label={`Remover ${addon.name || "complemento"}`}
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ ...styles.addonFooter, ...(isMobile ? styles.addonFooterMobile : {}) }}>
            <button
              type="button"
              style={{ ...styles.addonAddButton, ...(isMobile ? styles.fullWidthMobile : {}) }}
              onClick={() =>
                setCheckoutAddons([
                  ...checkoutAddons,
                  {
                    id: `addon-${Date.now()}`,
                    name: "Novo complemento",
                    unit_price: 2.5,
                    active: true,
                  },
                ])
              }
            >
              + Adicionar complemento
            </button>
            <button
              type="button"
              onClick={() => void saveCheckoutAddons()}
              disabled={savingAddons}
              style={{
                ...baseStyles.primaryLink,
                ...(savingAddons ? styles.disabledSoftButton : {}),
                ...(isMobile ? styles.fullWidthMobile : {}),
              }}
            >
              {savingAddons ? "Salvando..." : "Salvar complementos"}
            </button>
          </div>
        </section>
      </AdminShell>

      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          itemCount={itemCountByCategory[editingCategory.slug] || 0}
          onClose={() => setEditingCategory(null)}
          onSave={(updated) => {
            setCategories((current) =>
              sortCategories(
                current.map((category) =>
                  category.slug === updated.slug ? updated : category
                )
              )
            );
            setEditingCategory(null);
          }}
          onDelete={(deleted) => {
            setCategories((current) =>
              current.filter((category) => category.slug !== deleted.slug)
            );
            setItems((current) =>
              current.filter((item) => item.category !== deleted.slug)
            );
            setEditingCategory(null);
          }}
        />
      )}

      {creatingCategoryModalOpen && (
        <CategoryCreateModal
          categories={categories}
          onClose={() => setCreatingCategoryModalOpen(false)}
          onSave={(category) => {
            setCategories((current) => sortCategories([...current, category]));
            setExpandedCategories((current) => new Set(current).add(category.slug));
            setCreatingCategoryModalOpen(false);
          }}
        />
      )}

      {editingItem && (
        <EditModal
          item={editingItem}
          categories={categoryOptions}
          compact={isMobile || isTablet}
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
    </>
  );
}

function CategoryCreateModal({
  categories,
  onClose,
  onSave,
}: {
  categories: MenuCategory[];
  onClose: () => void;
  onSave: (category: MenuCategory) => void;
}) {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const slug = normalizeCategorySlug(name);
  const alreadyExists = categories.some((category) => category.slug === slug);
  const canSave = Boolean(name.trim()) && Boolean(slug) && !alreadyExists && !saving;

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/menu-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const result = (await response.json()) as {
        category?: MenuCategory;
        error?: string;
      };

      if (!response.ok || !result.category) {
        toast.error(result.error || "Não foi possível criar a categoria.");
        return;
      }

      toast.success(`Categoria "${result.category.name}" criada.`);
      onSave(result.category);
    } catch {
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...styles.modalOverlay, ...(isMobile ? styles.modalOverlayMobile : {}) }}>
      <div style={{ ...styles.modal, ...styles.categoryModal, ...(isMobile ? styles.modalMobile : {}), ...(isMobile ? styles.categoryModalMobile : {}) }}>
        <div style={{ ...styles.modalHeader, ...(isMobile ? styles.modalHeaderMobile : {}) }}>
          <div>
            <p style={styles.cardEyebrow}>Cardápio</p>
            <h2 style={{ ...styles.modalTitle, ...(isMobile ? styles.modalTitleMobile : {}) }}>Nova categoria</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.2} />
          </Button>
        </div>

        <div style={styles.modalPanel}>
          <label style={styles.field}>
            <span style={styles.label}>Nome da categoria</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
              autoFocus
              maxLength={60}
              placeholder="Ex: Combos especiais"
              style={{ ...styles.input, ...(isMobile ? styles.modalInputMobile : {}) }}
            />
          </label>
          {name.trim() && !slug && (
            <p style={styles.notice}>Use pelo menos uma letra ou número.</p>
          )}
          {alreadyExists && (
            <p style={styles.noticeStrong}>Já existe uma categoria com esse nome.</p>
          )}
        </div>

        <div style={{ ...styles.modalActions, ...(isMobile ? styles.modalActionsMobile : {}) }}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...styles.secondaryButton, ...(isMobile ? styles.modalActionButtonMobile : {}) }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...styles.primaryButton,
              ...(!canSave ? styles.primaryButtonDisabled : {}),
              ...(isMobile ? styles.modalActionButtonMobile : {}),
            }}
          >
            {saving ? "Criando..." : "Criar categoria"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryEditModal({
  category,
  itemCount,
  onClose,
  onSave,
  onDelete,
}: {
  category: MenuCategory;
  itemCount: number;
  onClose: () => void;
  onSave: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
}) {
  const isMobile = useIsMobile();
  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canSave = name.trim().length > 0 && !saving && !deleting;
  const canDelete = !saving && !deleting;

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    const payload = { name: name.trim() };
    const { data, error } = await supabase
      .from("menu_categories")
      .update(payload)
      .eq("slug", category.slug)
      .select()
      .maybeSingle();

    setSaving(false);

    if (error) {
      toast.error("Não foi possível salvar a categoria.");
      return;
    }

    onSave({ ...category, ...(data as Partial<MenuCategory>), ...payload });
    toast.success("Categoria atualizada.");
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    if (itemCount > 0) {
      const { error: deleteItemsError } = await supabase
        .from("menu")
        .delete()
        .eq("category", category.slug);

      if (deleteItemsError) {
        setDeleting(false);
        toast.error("Não foi possível excluir os itens desta categoria.");
        return;
      }
    }

    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("slug", category.slug);

    setDeleting(false);

    if (error) {
      toast.error("Não foi possível excluir a categoria.");
      return;
    }

    onDelete(category);
    toast.success("Categoria excluida.");
  };

  return (
    <div style={{ ...styles.modalOverlay, ...(isMobile ? styles.modalOverlayMobile : {}) }}>
      <div style={{ ...styles.modal, ...styles.categoryModal, ...(isMobile ? styles.modalMobile : {}), ...(isMobile ? styles.categoryModalMobile : {}) }}>
        <div style={{ ...styles.modalHeader, ...(isMobile ? styles.modalHeaderMobile : {}) }}>
          <div>
            <p style={styles.cardEyebrow}>Categoria</p>
            <h2 style={{ ...styles.modalTitle, ...(isMobile ? styles.modalTitleMobile : {}) }}>Editar categoria</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.2} />
          </Button>
        </div>

        <div style={styles.modalPanel}>
          <label style={styles.field}>
            <span style={styles.label}>Nome da categoria</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setConfirmDelete(false);
              }}
              style={{ ...styles.input, ...(isMobile ? styles.modalInputMobile : {}) }}
            />
          </label>

          <div style={styles.categoryReadOnlyBox}>
            <span>Itens nesta categoria</span>
            <strong>{itemCount}</strong>
          </div>
          {itemCount > 0 && (
            <p style={styles.notice}>
              Ao excluir esta categoria, {itemCount} itens também serão excluídos.
            </p>
          )}
        </div>

        <div style={{ ...styles.modalActions, ...(isMobile ? styles.modalActionsMobile : {}) }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            style={{
              ...styles.deleteButton,
              ...(confirmDelete ? styles.deleteButtonConfirm : {}),
              ...(!canDelete ? styles.disabledSoftButton : {}),
              ...(isMobile ? styles.modalActionButtonMobile : {}),
            }}
          >
            {deleting
              ? "Excluindo..."
              : confirmDelete
              ? "Confirmar exclusão"
              : "Excluir categoria"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...styles.primaryButton,
              ...(!canSave ? styles.primaryButtonDisabled : {}),
              ...(isMobile ? styles.modalActionButtonMobile : {}),
            }}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  item,
  categories,
  compact,
  onClose,
  onSave,
}: {
  item: EditableMenuItem;
  categories: MenuCategory[];
  compact: boolean;
  onClose: () => void;
  onSave: (item: MenuItem | DeletedMenuItem) => void;
}) {
  const isMobile = useIsMobile();
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
        category_order: form.category_order ?? getCategoryOrder(form.category, categories),
        sort_order: form.sort_order ?? 0,
        description: form.description,
        image: form.image || null,
        active: form.active !== false && form.availability_status !== "inativo",
        availability_status:
          form.availability_status === "esgotado" ? "inativo" : form.availability_status || "ativo",
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
    <div style={{ ...styles.modalOverlay, ...(isMobile ? styles.modalOverlayMobile : {}) }}>
      <div
        style={{
          ...styles.modal,
          ...(compact ? styles.modalCompact : {}),
          ...(isMobile ? styles.modalMobile : {}),
        }}
      >
        <div style={{ ...styles.modalHeader, ...(compact ? styles.modalHeaderCompact : {}), ...(isMobile ? styles.modalHeaderMobile : {}) }}>
          <div>
            <p style={styles.cardEyebrow}>Cardápio</p>
            <h2 style={{ ...styles.modalTitle, ...(isMobile ? styles.modalTitleMobile : {}) }}>
              {isNewItem ? "Adicionar item" : "Editar item"}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={2.2} />
          </Button>
        </div>

        <div style={{ ...styles.modalBody, ...(compact ? styles.modalBodyCompact : {}), ...(isMobile ? styles.modalBodyMobile : {}) }}>
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
                style={{ ...styles.input, ...(isMobile ? styles.modalInputMobile : {}) }}
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
                  style={{ ...styles.input, ...(isMobile ? styles.modalInputMobile : {}) }}
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
                      category_order: getCategoryOrder(category, categories),
                    });
                  }}
                  style={{ ...styles.select, ...(isMobile ? styles.modalInputMobile : {}) }}
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
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
                style={{ ...styles.textarea, ...(isMobile ? styles.modalInputMobile : {}) }}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Disponibilidade</span>
              <select
                value={
                  form.availability_status === "esgotado"
                    ? "inativo"
                    : form.availability_status || "ativo"
                }
                onChange={(event) => {
                  setConfirmDelete(false);
                  setForm({ ...form, availability_status: event.target.value });
                }}
                style={{ ...styles.select, ...(isMobile ? styles.modalInputMobile : {}) }}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Pausado</option>
              </select>
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

            <label style={{ ...styles.uploadCard, ...(isMobile ? styles.uploadCardMobile : {}) }}>
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

        <div
          style={{
            ...styles.modalActions,
            ...(compact ? styles.modalActionsCompact : {}),
            ...(isMobile ? styles.modalActionsMobile : {}),
          }}
        >
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || uploading || deleting}
            style={{
              ...styles.deleteButton,
              ...(confirmDelete ? styles.deleteButtonConfirm : {}),
              ...(isMobile ? styles.modalActionButtonMobile : {}),
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
              ...(isMobile ? styles.modalActionButtonMobile : {}),
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
    background: "#f5f1ea",
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
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  sidebarTop: {
    borderRight: "none",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    height: "auto",
  },
  sidebarMobile: {
    padding: "12px 12px 10px",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  sidebarTitle: {
    fontSize: 20,
    marginBottom: 22,
  },
  sidebarTitleMobile: {
    fontSize: 16,
    marginBottom: 10,
  },
  nav: {
    display: "grid",
    gap: 8,
  },
  navInline: {
    display: "flex",
    flexWrap: "wrap",
  },
  navMobile: {
    flexWrap: "nowrap",
    gap: 6,
    overflowX: "auto",
    paddingBottom: 2,
  },
  navLink: {
    color: "#514a43",
    textDecoration: "none",
    borderRadius: 8,
    padding: "12px 14px",
    fontWeight: 850,
  },
  navLinkMobile: {
    flex: "0 0 auto",
    padding: "9px 11px",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  navLinkActive: {
    background: "#1c1a17",
    color: "#fffdf8",
  },
  content: {
    padding: "28px 24px 56px",
    width: "min(1180px, 100%)",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  contentMobile: {
    padding: "18px 10px 34px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "end",
    marginBottom: 18,
    borderRadius: 16,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#1c1a17",
    color: "#fffdf8",
    padding: 22,
    boxShadow: "0 20px 50px rgba(28, 26, 23, 0.12)",
  },
  headerMobile: {
    display: "grid",
    alignItems: "start",
    gap: 10,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
  },
  eyebrow: {
    color: "#ff304f",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: "clamp(36px, 5vw, 58px)",
    lineHeight: 1,
  },
  titleMobile: {
    fontSize: 28,
    lineHeight: 1.05,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  headerActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    width: "100%",
  },
  primaryButton: getButtonStyle("primary", "md"),
  headerSecondaryButton: getButtonStyle("secondary", "md"),
  primaryButtonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  toolbar: {
    position: "sticky",
    top: 12,
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 280px)",
    gap: 10,
    marginBottom: 14,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 12,
    background: "var(--color-surface)",
    padding: 10,
    boxShadow: "var(--shadow-card)",
  },
  toolbarStack: {
    gridTemplateColumns: "1fr",
    gap: 7,
    position: "static",
    top: "auto",
    marginBottom: 8,
    borderRadius: 10,
    padding: 8,
  },
  searchWrap: {
    position: "relative",
    minWidth: 0,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9a9288",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    ...getInputStyle(),
    boxSizing: "border-box",
    minWidth: 0,
    paddingLeft: 36,
    background: "var(--color-surface)",
  },
  select: {
    ...getSelectStyle(),
    boxSizing: "border-box",
    minWidth: 0,
    background: "var(--color-surface)",
  },
  controlMobile: {
    minHeight: 44,
    padding: "10px 11px",
    fontSize: 16,
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
  activeFilterBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid rgba(159, 29, 47, 0.14)",
    borderRadius: 8,
    background: "#fff7f0",
    color: "#514a43",
    padding: "10px 12px",
    margin: "-4px 0 14px",
    fontSize: 13,
    fontWeight: 750,
  },
  activeFilterBarMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  clearFilterButton: {
    border: "none",
    borderRadius: 999,
    background: "#9f1d2f",
    color: "#fff",
    padding: "8px 11px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  fullWidthMobile: {
    gridColumn: "1 / -1",
    width: "100%",
  },
  headerButtonMobile: {
    width: "100%",
    minHeight: 42,
    padding: "10px 8px",
    fontSize: 13,
    boxShadow: "none",
  },
  categoryList: {
    display: "grid",
    gap: 16,
  },
  categoryListMobile: {
    gap: 9,
    paddingBottom: 14,
  },
  categoryCard: {
    background: "#fffdf8",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 12,
    padding: 0,
    overflow: "hidden",
    boxShadow: "0 10px 24px rgba(28, 26, 23, 0.035)",
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border 140ms ease",
  },
  categoryCardMobile: {
    padding: 0,
    borderRadius: 10,
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "16px 18px",
    borderBottom: "1px solid rgba(28, 26, 23, 0.06)",
    background: "#fffdf8",
  },
  categoryHeaderClosed: {
    borderBottom: "none",
  },
  categoryHeaderMobile: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
    padding: "11px 12px",
    marginBottom: 0,
  },
  categoryHeaderActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryHeaderActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    width: "100%",
  },
  categoryTitleGroup: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    minWidth: 0,
  },
  categoryTitleGroupMobile: {
    display: "grid",
    gridTemplateColumns: "36px minmax(0, 1fr) 36px",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  categoryTitleText: {
    minWidth: 0,
  },
  categoryToggle: {
    width: 36,
    height: 36,
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    background: "#fff",
    color: "#1c1a17",
    cursor: "pointer",
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  },
  categoryToggleMobile: {
    width: 36,
    height: 36,
    fontSize: 16,
  },
  categoryDragHandle: {
    color: "#b8afa4",
    cursor: "grab",
    fontWeight: 900,
    letterSpacing: -3,
    lineHeight: 1,
    touchAction: "none",
    userSelect: "none",
    padding: "8px 4px",
  },
  categoryDragHandleDisabled: {
    color: "#ded7cf",
    fontWeight: 900,
    letterSpacing: -3,
    lineHeight: 1,
    userSelect: "none",
    padding: "8px 4px",
  },
  categoryDragHandleMobile: {
    display: "grid",
    placeItems: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "1px solid rgba(28, 26, 23, 0.1)",
    background: "#fff",
    padding: 0,
    flexShrink: 0,
  },
  dragHandle: {
    color: "#9f1d2f",
    cursor: "grab",
    fontWeight: 850,
    lineHeight: 1.2,
    touchAction: "none",
    userSelect: "none",
  },
  dragHandleDisabled: {
    color: "#d8d0c4",
    fontWeight: 850,
    lineHeight: 1.2,
    userSelect: "none",
  },
  itemDragHandleMobile: {
    display: "grid",
    placeItems: "center",
    width: 18,
    minHeight: 52,
    padding: 0,
  },
  cardEyebrow: eyebrowStyle,
  categoryTitle: {
    fontSize: 21,
    lineHeight: 1.15,
  },
  categoryTitleMobile: {
    fontSize: 17,
    lineHeight: 1.15,
  },
  categoryMeta: {
    marginTop: 3,
    color: "#766e64",
    fontSize: 13,
    fontWeight: 750,
  },
  categoryActionButton: {
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: 999,
    background: "#fff",
    color: "#1c1a17",
    padding: "8px 11px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
  },
  categoryActionButtonMobile: {
    minHeight: 42,
    padding: "10px 12px",
    width: "100%",
    textAlign: "center",
    boxSizing: "border-box",
  },
  itemList: {
    display: "grid",
    gap: 10,
    padding: 14,
  },
  itemListMobile: {
    padding: "9px 10px 10px",
    gap: 7,
  },
  emptyCategoryText: {
    color: "#766e64",
    border: "1px dashed rgba(28, 26, 23, 0.16)",
    borderRadius: 8,
    padding: 14,
    background: "#fff",
  },
  itemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border 140ms ease",
  },
  draggingRow: {
    border: "1px solid rgba(159, 29, 47, 0.38)",
    background: "#fff7f0",
    boxShadow: "0 12px 30px rgba(159, 29, 47, 0.16)",
    transform: "scale(0.985)",
  },
  dragDropTarget: {
    border: "1px solid rgba(159, 29, 47, 0.72)",
    background: "#fff2e8",
    boxShadow: "inset 4px 0 0 #9f1d2f, 0 12px 28px rgba(159, 29, 47, 0.14)",
    transform: "translateY(-2px)",
  },
  itemCardPaused: {
    background: "#f7f4ef",
    opacity: 0.76,
  },
  itemStatusLine: {
    marginTop: 6,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  itemStatusBadgePaused: {
    borderRadius: 999,
    background: "#f0ebe2",
    color: "#625b53",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  itemCardMobile: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "stretch",
    gap: 9,
    padding: 9,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
  },
  itemMain: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  itemMainMobile: {
    display: "grid",
    gridTemplateColumns: "18px 68px minmax(0, 1fr)",
    alignItems: "start",
    gap: 8,
    minWidth: 0,
  },
  itemImage: {
    borderRadius: 8,
    objectFit: "cover",
    background: "#f0ebe2",
    flex: "0 0 auto",
  },
  itemImageMobile: {
    width: 68,
    height: 52,
  },
  itemImagePlaceholder: {
    width: 92,
    height: 64,
    borderRadius: 8,
    background: "linear-gradient(135deg, #f0ebe2, #fff7ed)",
    border: "1px dashed rgba(28, 26, 23, 0.16)",
    color: "#766e64",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    flex: "0 0 auto",
  },
  itemText: {
    minWidth: 0,
  },
  itemName: {
    fontSize: 17,
    lineHeight: 1.25,
  },
  itemNameMobile: {
    fontSize: 15,
    lineHeight: 1.16,
  },
  itemPrice: {
    color: "#625b53",
    marginTop: 4,
    fontWeight: 850,
  },
  itemPausedText: {
    marginTop: 4,
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 850,
  },
  itemDescription: {
    color: "#766e64",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 1.35,
  },
  itemDescriptionMobile: {
    fontSize: 12,
    lineHeight: 1.25,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: 8,
    flexWrap: "wrap",
  },
  itemActionsMobile: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(118px, auto)",
    alignItems: "center",
    columnGap: 8,
    width: "100%",
    justifySelf: "stretch",
    boxSizing: "border-box",
    minHeight: 45,
    paddingTop: 7,
    borderTop: "1px solid rgba(28, 26, 23, 0.06)",
  },
  itemActionsLeftMobile: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  itemSwitch: {
    width: 40,
    height: 24,
    border: "none",
    borderRadius: 999,
    padding: 3,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    boxShadow: "inset 0 1px 2px rgba(28, 26, 23, 0.16)",
    transition: "background 160ms ease",
  },
  itemSwitchActive: {
    background: "#34c759",
  },
  itemSwitchPaused: {
    background: "#d1d5db",
  },
  itemSwitchThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "#fff",
    boxShadow: "0 2px 5px rgba(28, 26, 23, 0.22)",
    transform: "translateX(0)",
    transition: "transform 160ms ease",
  },
  itemSwitchThumbActive: {
    transform: "translateX(16px)",
  },
  itemSwitchLabel: {
    color: "#625b53",
    fontSize: 12,
    fontWeight: 850,
    minWidth: 48,
  },
  secondaryButton: getButtonStyle("ghost", "sm"),
  secondaryButtonMobile: {
    justifySelf: "end",
    marginLeft: "auto",
    flexShrink: 0,
    minWidth: 118,
    minHeight: 39,
    padding: "10px 14px",
    justifyContent: "center",
    boxShadow: "none",
  },
  inactiveButton: {
    background: "#f0ebe2",
    color: "#766e64",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 120,
    background: "rgba(28, 26, 23, 0.46)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  modalOverlayMobile: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: 0,
  },
  modal: {
    width: "min(920px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "var(--color-surface)",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 18px 45px rgba(28, 26, 23, 0.22)",
  },
  modalMobile: {
    width: "100%",
    maxHeight: "min(94vh, 100%)",
    borderRadius: "16px 16px 0 0",
    padding: "16px 14px calc(16px + env(safe-area-inset-bottom, 0px))",
  },
  categoryModalMobile: {
    width: "100%",
  },
  modalHeaderMobile: {
    marginBottom: 12,
    alignItems: "center",
  },
  modalTitleMobile: {
    fontSize: 22,
    lineHeight: 1.1,
  },
  modalBodyMobile: {
    gridTemplateColumns: "1fr",
    gap: 14,
  },
  modalInputMobile: {
    fontSize: 16,
    minHeight: 44,
    boxSizing: "border-box",
  },
  uploadCardMobile: {
    minHeight: 180,
  },
  modalActionsMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
  },
  modalActionButtonMobile: {
    width: "100%",
    minHeight: 44,
    boxSizing: "border-box",
    justifyContent: "center",
    textAlign: "center",
  },
  categoryModal: {
    width: "min(560px, 100%)",
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
  categoryReadOnlyBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    background: "#f0ebe2",
    color: "#514a43",
    padding: "12px 14px",
  },
  categoryStatusPanel: {
    display: "grid",
    gap: 8,
  },
  categoryStatusActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  statusChoice: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    background: "#fffdf8",
    color: "#514a43",
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 850,
  },
  statusChoiceActive: {
    background: "#dcfce7",
    borderColor: "#86efac",
    color: "#166534",
  },
  statusChoiceDanger: {
    background: "#fee2e2",
    borderColor: "#fecaca",
    color: "#991b1b",
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
    gridTemplateColumns: "1fr",
    gap: 8,
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
  disabledSoftButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  addonsCard: {
    marginTop: 32,
  },
  addonsCardMobile: {
    marginTop: 24,
  },
  addonsHeader: {
    marginBottom: 16,
  },
  addonsHint: {
    marginTop: 6,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.45,
  },
  addonEmpty: {
    border: "1px dashed rgba(28, 26, 23, 0.14)",
    borderRadius: 10,
    background: "#f7f4ef",
    padding: "18px 16px",
    display: "grid",
    gap: 6,
  },
  addonEmptyTitle: {
    margin: 0,
    color: "#1c1a17",
    fontSize: 15,
    fontWeight: 850,
  },
  addonEmptyText: {
    margin: 0,
    color: "#766e64",
    fontSize: 13,
    lineHeight: 1.45,
  },
  addonTableHead: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(120px, 0.7fr) 140px 92px",
    gap: 10,
    padding: "0 14px 8px",
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  addonList: {
    display: "grid",
    gap: 8,
  },
  addonRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(120px, 0.7fr) 140px 92px",
    gap: 10,
    alignItems: "center",
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 10,
    background: "#fff",
    padding: "12px 14px",
  },
  addonRowMobile: {
    gridTemplateColumns: "1fr",
    alignItems: "stretch",
    gap: 12,
  },
  addonField: {
    display: "grid",
    gap: 5,
    minWidth: 0,
  },
  addonLabel: {
    color: "#766e64",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  addonPriceWrap: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 8,
    background: "#fffdf8",
    padding: "0 12px",
    minHeight: 46,
  },
  addonPricePrefix: {
    color: "#766e64",
    fontSize: 14,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  addonPriceInput: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#1c1a17",
    outline: "none",
    fontSize: 15,
    padding: "12px 0",
  },
  addonStatusCell: {
    display: "grid",
    gap: 5,
  },
  addonStatusControls: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  addonRemoveButton: {
    border: "1px solid rgba(153, 27, 27, 0.18)",
    borderRadius: 999,
    background: "#fff7f7",
    color: "#991b1b",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  addonFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid rgba(28, 26, 23, 0.08)",
  },
  addonFooterMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  addonAddButton: {
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 999,
    background: "#1c1a17",
    color: "#fffdf8",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
};
