import { createHmac, timingSafeEqual } from "crypto";
import { normalizeCustomerPhone } from "./customerPhone";

const SESSION_COOKIE = "misso_customer_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

const getSecret = () =>
  process.env.CUSTOMER_SESSION_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "misso-customer-session-dev";

const signPayload = (payload: string) =>
  createHmac("sha256", getSecret()).update(payload).digest("base64url");

export const customerSessionCookieName = SESSION_COOKIE;

export function createCustomerSessionToken(phone: string) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${normalizedPhone}|${exp}`;
  const payloadEncoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${payloadEncoded}.${signPayload(payload)}`;
}

export function verifyCustomerSessionToken(token?: string | null) {
  if (!token) return null;

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const payload = Buffer.from(payloadEncoded, "base64url").toString("utf8");
  const expected = signPayload(payload);

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  const [phone, expRaw] = payload.split("|");
  const exp = Number(expRaw);
  if (!phone || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  return { phone, exp };
}

export function getSessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
