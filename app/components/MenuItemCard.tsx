"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { colors, shadows } from "../../lib/designTokens";
import { money } from "../../lib/orderUtils";
import type { MenuItem } from "../../types";

type MenuItemCardProps = {
  item: MenuItem;
  quantity: number;
  unavailable: boolean;
  storeOpen: boolean;
  isMobile: boolean;
  isPulsing: boolean;
  variant?: "horizontal" | "featured";
  showPopularBadge?: boolean;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
};

export function MenuItemCard({
  item,
  quantity,
  unavailable,
  storeOpen,
  isMobile,
  isPulsing,
  variant = "horizontal",
  showPopularBadge = false,
  onAdd,
  onIncrease,
  onDecrease,
}: MenuItemCardProps) {
  const featured = variant === "featured";

  return (
    <article
      className={featured ? "menu-card-featured" : "menu-card-horizontal"}
      style={{
        ...(featured ? styles.featuredCard : styles.menuCard),
        ...(featured && isMobile ? styles.featuredCardMobile : {}),
        ...(!featured && isMobile ? styles.menuCardMobile : {}),
        ...(unavailable ? styles.menuCardUnavailable : {}),
        ...(isPulsing ? styles.menuCardPulse : {}),
      }}
    >
      <div
        style={{
          ...(featured ? styles.featuredImageWrap : styles.imageWrap),
          ...(featured && isMobile ? styles.featuredImageWrapMobile : {}),
          ...(!featured && isMobile ? styles.imageWrapMobile : {}),
        }}
      >
        {showPopularBadge && (
          <span style={styles.popularBadge}>Mais pedido</span>
        )}
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            priority={featured}
            loading={featured ? "eager" : undefined}
            sizes={
              featured
                ? "(max-width: 767px) 45vw, 220px"
                : "(max-width: 767px) 34vw, 160px"
            }
            style={styles.dishImage}
          />
        ) : (
          <div style={styles.imageFallback}>
            <span style={styles.fallbackMark}>M</span>
          </div>
        )}
      </div>

      <div
        style={{
          ...(featured ? styles.featuredBody : styles.cardBody),
          ...(featured && isMobile ? styles.featuredBodyMobile : {}),
          ...(!featured && isMobile ? styles.cardBodyMobile : {}),
        }}
      >
        <div>
          <h4
            style={{
              ...(featured ? styles.featuredName : styles.itemName),
              ...(!featured && isMobile ? styles.itemNameMobile : {}),
            }}
          >
            {item.name}
          </h4>
          {unavailable && (
            <div style={styles.badgeLine}>
              <span style={styles.unavailableBadge}>Indisponível</span>
            </div>
          )}
          {item.description && (
            <p
              style={{
                ...styles.itemDescription,
                ...(isMobile ? styles.itemDescriptionClamp : {}),
              }}
            >
              {item.description}
            </p>
          )}
        </div>

        <div
          style={{
            ...styles.cardFooter,
            ...(isMobile ? styles.cardFooterMobile : {}),
            ...(isMobile && featured ? styles.cardFooterFeaturedMobile : {}),
          }}
        >
          <strong
            style={{
              ...styles.price,
              ...(isMobile ? styles.priceMobile : {}),
            }}
          >
            {money(Number(item.price))}
          </strong>

          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={unavailable || !storeOpen}
              style={{
                ...styles.addButton,
                ...(isMobile ? styles.addButtonMobile : {}),
                ...(unavailable || !storeOpen ? styles.addButtonDisabled : {}),
              }}
              aria-label={
                unavailable ? `${item.name} indisponível` : `Adicionar ${item.name}`
              }
            >
              {unavailable ? "Indisponível" : "Adicionar"}
            </button>
          ) : (
            <div
              style={{
                ...styles.quantityControl,
                ...(isMobile ? styles.quantityControlMobile : {}),
                ...(isMobile && featured ? styles.quantityControlFeaturedMobile : {}),
              }}
            >
              <button
                type="button"
                onClick={onDecrease}
                style={{
                  ...styles.quantityButton,
                  ...(isMobile ? styles.quantityButtonMobile : {}),
                }}
                aria-label={`Remover ${item.name}`}
              >
                -
              </button>
              <span
                style={{
                  ...styles.quantityValue,
                  ...(isMobile ? styles.quantityValueMobile : {}),
                }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                style={{
                  ...styles.quantityButton,
                  ...styles.quantityButtonDark,
                  ...(isMobile ? styles.quantityButtonMobile : {}),
                }}
                aria-label={`Adicionar ${item.name}`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  menuCard: {
    minHeight: 132,
    background: colors.surface,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 12,
    display: "grid",
    gridTemplateColumns: "116px minmax(0, 1fr)",
    overflow: "hidden",
    boxShadow: shadows.card,
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  menuCardMobile: {
    gridTemplateColumns: "82px minmax(0, 1fr)",
    minHeight: 104,
    borderRadius: 10,
  },
  featuredCard: {
    background: colors.surface,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: shadows.card,
    display: "flex",
    flexDirection: "column",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  featuredCardMobile: {
    borderRadius: 12,
  },
  menuCardPulse: {
    transform: "scale(1.015)",
    borderColor: "rgba(159, 29, 47, 0.36)",
    boxShadow: "0 16px 38px rgba(159, 29, 47, 0.14)",
  },
  menuCardUnavailable: {
    opacity: 0.62,
  },
  imageWrap: {
    position: "relative",
    minHeight: 148,
    background: colors.warmBorder,
    overflow: "hidden",
  },
  imageWrapMobile: {
    minHeight: 104,
  },
  featuredImageWrap: {
    position: "relative",
    aspectRatio: "4 / 3",
    background: colors.warmBorder,
    overflow: "hidden",
  },
  featuredImageWrapMobile: {
    aspectRatio: "16 / 11",
  },
  dishImage: {
    objectFit: "cover",
    objectPosition: "center",
    transition: "transform 280ms ease",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #efe6d8, #f8f3ea)",
  },
  fallbackMark: {
    color: colors.brand,
    fontFamily: "var(--font-dm-serif), Georgia, serif",
    fontSize: 28,
    fontWeight: 700,
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 2,
    borderRadius: 999,
    background: "rgba(28, 26, 23, 0.82)",
    color: colors.surface,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.02em",
    backdropFilter: "blur(6px)",
  },
  cardBody: {
    minWidth: 0,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 14,
  },
  cardBodyMobile: {
    padding: "9px 10px",
    gap: 8,
  },
  featuredBody: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 12,
    flex: 1,
  },
  featuredBodyMobile: {
    padding: "10px 12px 12px",
    gap: 10,
  },
  itemName: {
    fontSize: 16,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  itemNameMobile: {
    fontSize: 14,
    lineHeight: 1.18,
  },
  featuredName: {
    fontSize: 17,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  badgeLine: {
    minHeight: 24,
    marginTop: 7,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  unavailableBadge: {
    borderRadius: 999,
    background: colors.errorBg,
    color: colors.error,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 850,
  },
  itemDescription: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 1.4,
  },
  itemDescriptionClamp: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardFooterMobile: {
    gap: 8,
    minWidth: 0,
  },
  cardFooterFeaturedMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 800,
  },
  priceMobile: {
    fontSize: 14,
  },
  addButton: {
    border: "none",
    background: colors.dark,
    color: colors.surface,
    borderRadius: 999,
    padding: "9px 13px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addButtonMobile: {
    minHeight: 40,
    padding: "9px 12px",
    fontSize: 12,
    alignSelf: "flex-end",
  },
  addButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  quantityControl: {
    display: "inline-grid",
    gridTemplateColumns: "36px 28px 36px",
    alignItems: "center",
    justifyItems: "center",
    background: colors.warm,
    borderRadius: 999,
    padding: 4,
    flexShrink: 0,
  },
  quantityControlMobile: {
    gridTemplateColumns: "38px 24px 38px",
    padding: 3,
  },
  quantityControlFeaturedMobile: {
    alignSelf: "flex-end",
  },
  quantityButton: {
    width: 36,
    height: 36,
    border: "none",
    borderRadius: 999,
    background: colors.surface,
    color: colors.text,
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
    padding: 0,
  },
  quantityButtonMobile: {
    width: 38,
    height: 38,
    fontSize: 17,
  },
  quantityButtonDark: {
    background: colors.brand,
    color: "#fff",
  },
  quantityValue: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: 800,
  },
  quantityValueMobile: {
    fontSize: 12,
  },
};
