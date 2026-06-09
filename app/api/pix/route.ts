import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    console.log("🔥 PIX CHAMADO - amount:", amount);

    const value = Number(amount);

    if (!value || value <= 0) {
      console.log("❌ VALOR INVÁLIDO");
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    console.log("🔑 TOKEN EXISTE:", !!token);

    if (!token) {
      return NextResponse.json(
        { error: "Token não configurado" },
        { status: 500 }
      );
    }

    const client = new MercadoPagoConfig({
      accessToken: token,
    });

    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: value,
        payment_method_id: "pix",
        description: "Missô Sushi Pedido",
        payer: {
          email: "test_user_123@testuser.com",
        },
      },
    });

    console.log("📦 RESULTADO MERCADO PAGO:", result);

    const pix = result.point_of_interaction?.transaction_data;

    if (!pix) {
      return NextResponse.json(
        {
          error: "PIX não retornou",
          debug: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
    });

  } catch (err) {
    console.error("🔥 ERRO PIX COMPLETO:", err);

    return NextResponse.json(
      {
        error: "Erro interno PIX",
        detail: err instanceof Error ? err.message : err,
      },
      { status: 500 }
    );
  }
}