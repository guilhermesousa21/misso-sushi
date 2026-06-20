import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidCustomerPhone } from "../../../../../lib/customerPhone";
import {
  createCustomerSessionToken,
  customerSessionCookieName,
  getSessionCookieOptions,
} from "../../../../../lib/customerSession";
import { verifyOtpChallenge } from "../../../../../lib/otpStore";

export async function POST(request: Request) {
  try {
    const { phone, code } = (await request.json()) as { phone?: string; code?: string };

    if (!phone || !isValidCustomerPhone(phone)) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    const sanitizedCode = String(code || "").replace(/\D/g, "").slice(0, 6);
    if (sanitizedCode.length !== 6) {
      return NextResponse.json({ error: "Informe o código de 6 dígitos." }, { status: 400 });
    }

    const valid = await verifyOtpChallenge(phone, sanitizedCode);
    if (!valid) {
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 401 });
    }

    const token = createCustomerSessionToken(phone);
    const cookieStore = await cookies();
    cookieStore.set(customerSessionCookieName, token, getSessionCookieOptions());

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o código." }, { status: 500 });
  }
}
