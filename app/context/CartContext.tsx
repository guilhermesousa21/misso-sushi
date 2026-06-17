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

type CartItem = {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  cartLoaded: boolean;
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  increase: (id: number) => void;
  decrease: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const cartStorageKey = "misso-sushi-cart";
const cartStorageEvent = "misso-sushi-cart-change";
const emptyCartSnapshot = "[]";

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

const normalizeCartItem = (item: CartItem): CartItem => ({
  ...item,
  price: Number(item.price),
  category: item.category || "",
});

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

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    updateCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const increase = (id: number) => {
    updateCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  };

  const decrease = (id: number) => {
    updateCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const remove = (id: number) => {
    updateCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clear = () => writeCartSnapshot([]);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, cartLoaded, addToCart, increase, decrease, remove, clear, total }}
    >
      {children}
    </CartContext.Provider>
  );
}
