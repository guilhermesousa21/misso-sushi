export const PIX_PAYMENT_TTL_SECONDS = 15 * 60;
export const PIX_PAYMENT_TTL_MS = PIX_PAYMENT_TTL_SECONDS * 1000;
export const PENDING_ORDER_RECOVERY_HOURS = 24;

export const normalizePaymentStatus = (status?: string | null) =>
  (status || "pendente").trim().toLowerCase();

export const isPaymentPaid = (status?: string | null) =>
  normalizePaymentStatus(status) === "pago";

export const isPaymentExpired = (status?: string | null) =>
  normalizePaymentStatus(status) === "expirado";

export const isPaymentRecoverable = (status?: string | null) => {
  const normalized = normalizePaymentStatus(status);
  return normalized === "pendente" || normalized === "expirado" || normalized === "falhou";
};

export const getPixExpiresAt = (referenceTimeMs: number) => referenceTimeMs + PIX_PAYMENT_TTL_MS;

export const getPixCountdownSeconds = (referenceTimeMs: number) =>
  Math.max(0, Math.floor((getPixExpiresAt(referenceTimeMs) - Date.now()) / 1000));

export const isPixWindowExpired = (referenceTimeMs: number) =>
  getPixCountdownSeconds(referenceTimeMs) <= 0;

export const isWithinRecoveryWindow = (createdAt: string) => {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= PENDING_ORDER_RECOVERY_HOURS * 60 * 60 * 1000;
};

export const getPendingPaymentLabel = (status?: string | null) => {
  if (isPaymentExpired(status)) return "PIX expirado";
  if (normalizePaymentStatus(status) === "falhou") return "Pagamento recusado";
  return "Aguardando pagamento";
};

export const formatPaymentCountdown = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export async function expireOrderPayment(orderId: number) {
  const response = await fetch(`/api/orders/${orderId}/expire-payment`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível expirar o pagamento.");
  }
  return data as { ok: boolean; payment_status?: string; alreadyPaid?: boolean };
}
