"use client";

import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/Button";
import { colors } from "../../lib/designTokens";
import { useIsMobile } from "../../lib/useMediaQuery";

type PixPaymentPanelProps = {
  amountLabel: string;
  pixCode: string;
  pixQr: string;
  copyFeedback: boolean;
  onCopy: () => void;
  countdownSeconds?: number;
  expired?: boolean;
  onRegenerate?: () => void;
  regenerateLoading?: boolean;
};

export function PixPaymentPanel({
  amountLabel,
  pixCode,
  pixQr,
  copyFeedback,
  onCopy,
  countdownSeconds,
  expired = false,
  onRegenerate,
  regenerateLoading = false,
}: PixPaymentPanelProps) {
  const isMobile = useIsMobile();
  const qrSize = isMobile ? 190 : 210;
  const showCountdown = typeof countdownSeconds === "number" && !expired;

  return (
    <div style={styles.panel}>
      <div style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
        <BrandLogo size="sm" />
        <div>
          <p style={styles.title}>{expired ? "PIX expirado" : "Pagamento PIX"}</p>
          <p style={styles.hint}>
            {expired
              ? "O prazo deste PIX acabou. Gere um novo código para concluir o mesmo pedido, sem refazer o carrinho."
              : "Escaneie o QR Code ou copie o código. A página atualiza sozinha após a confirmação."}
          </p>
          {showCountdown && (
            <p style={styles.countdown}>
              Tempo restante: <strong>{formatCountdown(countdownSeconds)}</strong>
            </p>
          )}
        </div>
      </div>

      {!expired && (
      <div
        style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : {}) }}
        className="pix-payment-panel-body"
      >
        <div style={styles.qrFrame}>
          <div style={styles.qrInner}>
            {pixCode ? (
              <QRCodeSVG value={pixCode} size={qrSize} level="M" includeMargin />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pixQr}`}
                alt="QR Code PIX"
                width={qrSize}
                height={qrSize}
                style={styles.qrImage}
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
      )}

      {expired && onRegenerate && (
        <div style={styles.expiredActions}>
          <Button type="button" fullWidth size="lg" onClick={onRegenerate} disabled={regenerateLoading}>
            {regenerateLoading ? "Gerando novo PIX..." : "Gerar novo PIX"}
          </Button>
        </div>
      )}
    </div>
  );
}

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

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
  headerMobile: {
    padding: "14px 16px",
    alignItems: "flex-start",
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
  countdown: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: 850,
  },
  expiredActions: {
    padding: "16px 20px",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr)",
    gap: 18,
    padding: 20,
  },
  bodyMobile: {
    padding: 16,
    gap: 14,
  },
  qrFrame: {
    border: `2px solid ${colors.brand}`,
    borderRadius: 14,
    padding: 16,
    display: "grid",
    justifyItems: "center",
    gap: 10,
    background: "#fff",
    width: "100%",
    maxWidth: 280,
    justifySelf: "center",
  },
  qrInner: {
    borderRadius: 10,
    overflow: "hidden",
    maxWidth: "100%",
  },
  qrImage: {
    maxWidth: "100%",
    height: "auto",
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
