"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";

export type CartItem = {
  lineKey: string;
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  quantity: number;
  modifiers?: string[];
};

type CartContextType = {
  cart: CartItem[];
  cartLoaded: boolean;
  addToCart: (item: Omit<CartItem, "quantity" | "lineKey" | "modifiers">, modifiers?: string[]) => void;
  increase: (lineKey: string) => void;
  decrease: (lineKey: string) => void;
  increaseById: (id: number) => void;
  decreaseById: (id: number) => void;
  remove: (lineKey: string) => void;
  removeById: (id: number) => void;
  updateModifiers: (lineKey: string, modifiers: string[]) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const cartStorageKey = "misso-sushi-cart";
const cartStorageEvent = "misso-sushi-cart-change";
const emptyCartSnapshot = "[]";

export const buildCartLineKey = (id: number, modifiers: string[] = []) =>
  `${id}:${[...modifiers].sort().join("|")}`;

const isCartItem = (item: unknown): item is CartItem => {
  if (!item || typeof item !== "object") return false;

  const cartItem = item as Partial<CartItem>;
  const price = Number(cartItem.price);

  return (
    typeof cartItem.id === "number" &&
    typeof cartItem.name === "string" &&
    Number.isFinite(price) &&
    typeof cartItem.quantity === "number" &&
    cartItem.quantity > 0
  );
};

const normalizeCartItem = (item: CartItem): CartItem => {
  const modifiers = item.modifiers || [];
  const lineKey = item.lineKey || buildCartLineKey(item.id, modifiers);

  return {
    ...item,
    lineKey,
    modifiers,
    price: Number(item.price),
    category: item.category || "",
  };
};

const parseCartSnapshot = (snapshot: string) => {
  try {
    const parsedCart = JSON.parse(snapshot);
    if (!Array.isArray(parsedCart)) return [];

    return parsedCart.filter(isCartItem).map(normalizeCartItem);
  } catch {
    return [];
  }
};

const getCartSnapshot = () => {
  if (typeof window === "undefined") return emptyCartSnapshot;
  return window.localStorage.getItem(cartStorageKey) || emptyCartSnapshot;
};

const subscribeToCart = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(cartStorageEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(cartStorageEvent, callback);
  };
};

const writeCartSnapshot = (cart: CartItem[]) => {
  if (typeof window === "undefined") return;

  if (cart.length === 0) {
    window.localStorage.removeItem(cartStorageKey);
  } else {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }

  window.dispatchEvent(new Event(cartStorageEvent));
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartLoaded, setCartLoaded] = useState(false);
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    () => emptyCartSnapshot
  );
  const cart = useMemo(() => parseCartSnapshot(cartSnapshot), [cartSnapshot]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCartLoaded(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateCart = (updater: (currentCart: CartItem[]) => CartItem[]) => {
    writeCartSnapshot(updater(cart));
  };

  const addToCart = (
    item: Omit<CartItem, "quantity" | "lineKey" | "modifiers">,
    modifiers: string[] = []
  ) => {
    const lineKey = buildCartLineKey(item.id, modifiers);
    updateCart((prev) => {
      const existing = prev.find((entry) => entry.lineKey === lineKey);
      if (existing) {
        return prev.map((entry) =>
          entry.lineKey === lineKey ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...prev, { ...item, lineKey, modifiers, quantity: 1 }];
    });
  };

  const increase = (lineKey: string) => {
    updateCart((prev) =>
      prev.map((entry) =>
        entry.lineKey === lineKey ? { ...entry, quantity: entry.quantity + 1 } : entry
      )
    );
  };

  const decrease = (lineKey: string) => {
    updateCart((prev) =>
      prev
        .map((entry) =>
          entry.lineKey === lineKey ? { ...entry, quantity: entry.quantity - 1 } : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const findPreferredLineById = (items: CartItem[], id: number) =>
    items.find((entry) => entry.id === id && !(entry.modifiers || []).length) ||
    items.find((entry) => entry.id === id);

  const increaseById = (id: number) => {
    updateCart((prev) => {
      const target = findPreferredLineById(prev, id);
      if (target) {
        return prev.map((entry) =>
          entry.lineKey === target.lineKey
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return prev;
    });
  };

  const decreaseById = (id: number) => {
    updateCart((prev) => {
      const candidates = prev.filter((entry) => entry.id === id);
      const target = [...candidates].reverse().find((entry) => entry.quantity > 0);
      if (!target) return prev;

      return prev
        .map((entry) =>
          entry.lineKey === target.lineKey
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry
        )
        .filter((entry) => entry.quantity > 0);
    });
  };

  const remove = (lineKey: string) => {
    updateCart((prev) => prev.filter((entry) => entry.lineKey !== lineKey));
  };

  const removeById = (id: number) => {
    updateCart((prev) => prev.filter((entry) => entry.id !== id));
  };

  const updateModifiers = (lineKey: string, modifiers: string[]) => {
    updateCart((prev) => {
      const current = prev.find((entry) => entry.lineKey === lineKey);
      if (!current) return prev;

      const nextKey = buildCartLineKey(current.id, modifiers);
      const withoutCurrent = prev.filter((entry) => entry.lineKey !== lineKey);
      const existing = withoutCurrent.find((entry) => entry.lineKey === nextKey);

      if (existing) {
        return withoutCurrent.map((entry) =>
          entry.lineKey === nextKey
            ? { ...entry, quantity: entry.quantity + current.quantity }
            : entry
        );
      }

      return [
        ...withoutCurrent,
        {
          ...current,
          lineKey: nextKey,
          modifiers,
        },
      ];
    });
  };

  const clear = () => writeCartSnapshot([]);

  const total = cart.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoaded,
        addToCart,
        increase,
        decrease,
        increaseById,
        decreaseById,
        remove,
        removeById,
        updateModifiers,
        clear,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
