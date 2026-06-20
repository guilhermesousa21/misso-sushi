import { NextResponse } from "next/server";
import { isValidCustomerPhone } from "../../../../../lib/customerPhone";
import { generateOtpCode, saveOtpChallenge } from "../../../../../lib/otpStore";
import { sendWhatsAppText } from "../../../../../lib/whatsappSend";

export async function POST(request: Request) {
  try {
    const { phone } = (await request.json()) as { phone?: string };

    if (!phone || !isValidCustomerPhone(phone)) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    const code = generateOtpCode();
    await saveOtpChallenge(phone, code);

    const message = [
      "Missô Sushi — código de acesso",
      "",
      `Seu código: ${code}`,
      "",
      "Use este código em Meus pedidos para ver seus últimos pedidos.",
      "Válido por 10 minutos.",
    ].join("\n");

    const result = await sendWhatsAppText(phone, message);

    if (!result.ok) {
      if (!result.configured) {
        return NextResponse.json(
          {
            error: "WhatsApp não configurado. Em desenvolvimento, use o código exibido no servidor.",
            devCode: process.env.NODE_ENV !== "production" ? code : undefined,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: "Código enviado por WhatsApp.",
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o código." }, { status: 500 });
  }
}
