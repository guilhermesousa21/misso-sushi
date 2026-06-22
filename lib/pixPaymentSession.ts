import { readStorageJson, removeStorage, writeStorageJson } from "./clientStorage";

export type PixPaymentSession = {
  orderId: number;
  pixQr: string;
  pixCode: string;
  expiresAt: number;
};

const storageKey = "misso-sushi-pix-session";
const PIX_SESSION_TTL_MS = 15 * 60 * 1000;

const isPixPaymentSession = (value: unknown): value is PixPaymentSession => {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<PixPaymentSession>;
  return (
    typeof session.orderId === "number" &&
    Number.isFinite(session.orderId) &&
    typeof session.pixQr === "string" &&
    typeof session.pixCode === "string" &&
    typeof session.expiresAt === "number" &&
    Number.isFinite(session.expiresAt)
  );
};

export const isPixPaymentSessionActive = (session: PixPaymentSession | null) =>
  Boolean(session && session.expiresAt > Date.now() && session.pixCode.trim());

export const readPixPaymentSession = (): PixPaymentSession | null => {
  const session = readStorageJson(storageKey, "session", null as PixPaymentSession | null, (value): value is PixPaymentSession | null =>
    value === null ? true : isPixPaymentSession(value)
  );

  if (!session || !isPixPaymentSessionActive(session)) {
    if (session) removeStorage(storageKey, "session");
    return null;
  }

  return session;
};

export const writePixPaymentSession = (input: {
  orderId: number;
  pixQr: string;
  pixCode: string;
  expiresAt?: number;
}) => {
  writeStorageJson(storageKey, "session", {
    orderId: input.orderId,
    pixQr: input.pixQr,
    pixCode: input.pixCode,
    expiresAt: input.expiresAt ?? Date.now() + PIX_SESSION_TTL_MS,
  } satisfies PixPaymentSession);
};

export const clearPixPaymentSession = () => removeStorage(storageKey, "session");

export const getPixSessionCountdownSeconds = (session: PixPaymentSession) =>
  Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
