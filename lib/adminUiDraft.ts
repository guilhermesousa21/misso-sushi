import { readStorageJson, removeStorage, writeStorageJson } from "./clientStorage";

export type AdminMenuUiDraft = {
  search: string;
  filterCategory: string;
  expandedCategories: string[];
};

export type AdminFaturamentoUiDraft = {
  search: string;
  dateRange: "today" | "7d" | "30d" | "all" | "custom";
  dateFrom: string;
  dateTo: string;
  view: "painel" | "pedidos";
};

export type AdminPromocoesUiDraft = {
  form: Record<string, unknown>;
  editingPromotionId: number | null;
};

export type AdminConfigUiDraft = {
  settings: Record<string, unknown>;
};

const menuKey = "misso-sushi-admin-menu-ui";
const faturamentoKey = "misso-sushi-admin-faturamento-ui";
const promocoesKey = "misso-sushi-admin-promocoes-ui";
const configKey = "misso-sushi-admin-config-ui";

const emptyMenuDraft: AdminMenuUiDraft = {
  search: "",
  filterCategory: "",
  expandedCategories: [],
};

const emptyFaturamentoDraft: AdminFaturamentoUiDraft = {
  search: "",
  dateRange: "30d",
  dateFrom: "",
  dateTo: "",
  view: "painel",
};

export const readAdminMenuUiDraft = (): AdminMenuUiDraft =>
  readStorageJson(menuKey, "session", emptyMenuDraft);

export const writeAdminMenuUiDraft = (draft: AdminMenuUiDraft) => {
  const hasContent =
    draft.search.trim() ||
    draft.filterCategory.trim() ||
    draft.expandedCategories.length > 0;

  if (!hasContent) {
    removeStorage(menuKey, "session");
    return;
  }

  writeStorageJson(menuKey, "session", draft);
};

export const readAdminFaturamentoUiDraft = (): AdminFaturamentoUiDraft =>
  readStorageJson(faturamentoKey, "session", emptyFaturamentoDraft);

export const writeAdminFaturamentoUiDraft = (draft: AdminFaturamentoUiDraft) => {
  const hasContent =
    draft.search.trim() ||
    draft.dateRange !== "30d" ||
    draft.dateFrom.trim() ||
    draft.dateTo.trim() ||
    draft.view !== "painel";

  if (!hasContent) {
    removeStorage(faturamentoKey, "session");
    return;
  }

  writeStorageJson(faturamentoKey, "session", draft);
};

export const readAdminPromocoesUiDraft = (): AdminPromocoesUiDraft | null => {
  const draft = readStorageJson(promocoesKey, "session", null as AdminPromocoesUiDraft | null);
  if (!draft || typeof draft !== "object") return null;
  if (!draft.form || typeof draft.form !== "object") return null;
  return {
    form: draft.form as Record<string, unknown>,
    editingPromotionId:
      typeof draft.editingPromotionId === "number" ? draft.editingPromotionId : null,
  };
};

export const writeAdminPromocoesUiDraft = (draft: AdminPromocoesUiDraft) => {
  writeStorageJson(promocoesKey, "session", draft);
};

export const clearAdminPromocoesUiDraft = () => removeStorage(promocoesKey, "session");

export const readAdminConfigUiDraft = (): AdminConfigUiDraft | null => {
  const draft = readStorageJson(configKey, "session", null as AdminConfigUiDraft | null);
  if (!draft?.settings || typeof draft.settings !== "object") return null;
  return { settings: draft.settings as Record<string, unknown> };
};

export const writeAdminConfigUiDraft = (draft: AdminConfigUiDraft) => {
  writeStorageJson(configKey, "session", draft);
};

export const clearAdminConfigUiDraft = () => removeStorage(configKey, "session");
