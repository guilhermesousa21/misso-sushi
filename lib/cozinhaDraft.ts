import { readStorageJson, removeStorage, writeStorageJson } from "./clientStorage";

export type KitchenFilter = "recebidos" | "prontos" | "atrasados" | "retirados";

const storageKey = "misso-sushi-cozinha-filter";

const isKitchenFilter = (value: unknown): value is KitchenFilter =>
  value === "recebidos" ||
  value === "prontos" ||
  value === "atrasados" ||
  value === "retirados";

export const readCozinhaFilter = (): KitchenFilter | null => {
  const filter = readStorageJson(storageKey, "session", null as KitchenFilter | null, (value): value is KitchenFilter | null =>
    value === null ? true : isKitchenFilter(value)
  );
  return isKitchenFilter(filter) ? filter : null;
};

export const writeCozinhaFilter = (filter: KitchenFilter | null) => {
  if (!filter) {
    removeStorage(storageKey, "session");
    return;
  }
  writeStorageJson(storageKey, "session", filter);
};
