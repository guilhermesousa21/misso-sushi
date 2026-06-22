import { readStorageJson, removeStorage, writeStorageJson } from "./clientStorage";

export type MenuBrowseDraft = {
  searchTerm: string;
  activeCategory: string;
  scrollY: number;
  openCart: boolean;
};

const storageKey = "misso-sushi-menu-browse";

const emptyDraft: MenuBrowseDraft = {
  searchTerm: "",
  activeCategory: "",
  scrollY: 0,
  openCart: false,
};

export const readMenuBrowseDraft = (): MenuBrowseDraft =>
  readStorageJson(storageKey, "local", emptyDraft, (value): value is MenuBrowseDraft => {
    if (!value || typeof value !== "object") return false;
    const draft = value as Partial<MenuBrowseDraft>;
    return (
      typeof draft.searchTerm === "string" &&
      typeof draft.activeCategory === "string" &&
      typeof draft.scrollY === "number" &&
      typeof draft.openCart === "boolean"
    );
  });

export const writeMenuBrowseDraft = (draft: MenuBrowseDraft) => {
  const hasContent =
    draft.searchTerm.trim() ||
    draft.activeCategory.trim() ||
    draft.scrollY > 0 ||
    draft.openCart;

  if (!hasContent) {
    removeStorage(storageKey, "local");
    return;
  }

  writeStorageJson(storageKey, "local", draft);
};

export const clearMenuBrowseDraft = () => removeStorage(storageKey, "local");
