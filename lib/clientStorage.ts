export type StorageScope = "local" | "session";

const getStorage = (scope: StorageScope) => {
  if (typeof window === "undefined") return null;
  return scope === "local" ? window.localStorage : window.sessionStorage;
};

export const readStorageJson = <T>(
  key: string,
  scope: StorageScope,
  fallback: T,
  validate?: (value: unknown) => value is T
): T => {
  const storage = getStorage(scope);
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
};

export const writeStorageJson = <T>(key: string, scope: StorageScope, value: T) => {
  const storage = getStorage(scope);
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
};

export const removeStorage = (key: string, scope: StorageScope) => {
  const storage = getStorage(scope);
  if (!storage) return;
  storage.removeItem(key);
};
