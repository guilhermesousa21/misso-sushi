"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { menu } from "./data/menu";
import { useCart } from "./context/CartContext";

type MenuItem = {
  id: number;
  name: string;
  price: number;
  category: string;
};

export default function Page() {
  const router = useRouter();

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [openCart, setOpenCart] = useState(false);

  const { addToCart, cart, increase, decrease, total } = useCart();

  const scrollToCategory = (category: string) => {
    sectionRefs.current[category]?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleAdd = (item: MenuItem) => {
    addToCart(item);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const orderData = {
      items: cart,
      total,
    };

    sessionStorage.setItem("order", JSON.stringify(orderData));

    setOpenCart(false);
    router.push("/checkout");
  };

  const getQuantity = (id: number) => {
    const found = cart.find((i) => i.id === id);
    return found?.quantity || 0;
  };

  return (
    <div style={{ background: "#f6f6f6", minHeight: "100vh" }}>
      {/* HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          padding: 15,
          borderBottom: "1px solid #eee",
          zIndex: 10,
        }}
      >
        <h2 style={{ margin: 0 }}>🍣 Missô Sushi</h2>
      </header>

      {/* CATEGORIAS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: 10,
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        {menu.map((section) => (
          <button
            key={section.category}
            onClick={() => scrollToCategory(section.category)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "#fff",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {section.category}
          </button>
        ))}
      </div>

      {/* MENU */}
      <div style={{ padding: 15 }}>
        {menu.map((section) => (
          <div
            key={section.category}
            ref={(el) => {
              sectionRefs.current[section.category] = el;
            }}
            style={{ marginBottom: 30 }}
          >
            <h3 style={{ marginBottom: 10 }}>{section.category}</h3>

            {section.items.map((item) => {
              const qty = getQuantity(item.id);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    padding: 15,
                    borderRadius: 12,
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <p style={{ margin: 0, color: "#666" }}>
                      R$ {item.price.toFixed(2)}
                    </p>
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => handleAdd(item)}
                      style={{
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        padding: "8px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      + Add
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#f4f4f4",
                        padding: "6px 10px",
                        borderRadius: 999,
                      }}
                    >
                      <button
                        onClick={() => decrease(item.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          border: "1px solid #ddd",
                          background: "#fff",
                          fontSize: 18,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        −
                      </button>

                      <span style={{ minWidth: 20, textAlign: "center" }}>
                        {qty}
                      </span>

                      <button
                        onClick={() => increase(item.id)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          border: "none",
                          background: "#00c853",
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* BOTÃO CARRINHO */}
      <div
        onClick={() => setOpenCart(true)}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#111",
          color: "#fff",
          padding: 16,
          textAlign: "center",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        🛒 Ver carrinho • {cart.length} itens • R$ {total.toFixed(2)}
      </div>

      {/* CART FULLSCREEN */}
      {openCart && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#fff",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottom: "1px solid #eee",
            }}
          >
            <h3 style={{ margin: 0 }}>Carrinho</h3>

            <button
              onClick={() => setOpenCart(false)}
              style={{
                background: "#f5f5f5",
                border: "1px solid #e0e0e0",
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✕ Fechar
            </button>
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {cart.length === 0 ? (
              <p>Seu carrinho está vazio</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 12,
                    borderBottom: "1px solid #eee",
                    paddingBottom: 12,
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <p style={{ margin: 0, color: "#666" }}>
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => decrease(item.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() => increase(item.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        border: "none",
                        background: "#00c853",
                        color: "#fff",
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FOOTER */}
          <div
            style={{
              borderTop: "1px solid #eee",
              padding: 16,
            }}
          >
            <h3>Total: R$ {total.toFixed(2)}</h3>

            {cart.length > 0 && (
              <button
                onClick={handleCheckout}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: 15,
                  background: "#00c853",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                💳 Finalizar pedido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}