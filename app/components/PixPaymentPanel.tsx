"use client";

import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/Button";
import { colors } from "../../lib/designTokens";

type PixPaymentPanelProps = {
  amountLabel: string;
  pixCode: string;
  pixQr: string;
  copyFeedback: boolean;
  onCopy: () => void;
};

export function PixPaymentPanel({
  amountLabel,
  pixCode,
  pixQr,
  copyFeedback,
  onCopy,
}: PixPaymentPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <BrandLogo size="sm" />
        <div>
          <p style={styles.title}>Pagamento PIX</p>
          <p style={styles.hint}>
            Escaneie o QR Code ou copie o código. A página atualiza sozinha após a confirmação.
          </p>
        </div>
      </div>

      <div style={styles.body} className="pix-payment-panel-body">
        <div style={styles.qrFrame}>
          <div style={styles.qrInner}>
            {pixCode ? (
              <QRCodeSVG value={pixCode} size={210} level="M" includeMargin />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pixQr}`}
                alt="QR Code PIX"
                width={210}
                height={210}
              />
            )}
          </div>
          <strong style={styles.amount}>{amountLabel}</strong>
        </div>

        {pixCode && (
          <div style={styles.copySection}>
            <label htmlFor="pixCode" style={styles.copyLabel}>
              Código copia e cola
            </label>
            <textarea id="pixCode" value={pixCode} readOnly style={styles.codeArea} />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={onCopy}
            >
              {copyFeedback ? (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  Código copiado
                </>
              ) : (
                <>
                  <Copy size={16} strokeWidth={2.5} />
                  Copiar código PIX
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    marginTop: 18,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    borderRadius: 16,
    overflow: "hidden",
    background: colors.surface,
    boxShadow: "0 16px 36px rgba(28, 26, 23, 0.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 20px",
    borderBottom: "1px solid rgba(28, 26, 23, 0.08)",
    background: "linear-gradient(180deg, #fffdf8, #f7f4ef)",
  },
  title: {
    fontSize: 18,
    fontWeight: 850,
    lineHeight: 1.2,
  },
  hint: {
    marginTop: 4,
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 1.45,
    maxWidth: 420,
  },
  body: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr)",
    gap: 18,
    padding: 20,
  },
  qrFrame: {
    border: `2px solid ${colors.brand}`,
    borderRadius: 14,
    padding: 16,
    display: "grid",
    justifyItems: "center",
    gap: 10,
    background: "#fff",
  },
  qrInner: {
    borderRadius: 10,
    overflow: "hidden",
  },
  amount: {
    fontSize: 22,
    color: colors.text,
  },
  copySection: {
    display: "grid",
    alignContent: "start",
    gap: 10,
  },
  copyLabel: {
    fontSize: 13,
    fontWeight: 850,
    color: colors.textMuted,
  },
  codeArea: {
    width: "100%",
    minHeight: 96,
    resize: "none",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    borderRadius: 10,
    padding: 12,
    color: "#514a43",
    background: "#fff",
    lineHeight: 1.45,
    fontFamily: "inherit",
    fontSize: 13,
  },
};
