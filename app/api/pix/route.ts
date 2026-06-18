import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { amount, note, payer } = await req.json();
    const value = Number(amount);

    if (!value || value <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken: token });
    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: value,
        payment_method_id: "pix",
        description: note || "Missô Sushi Pedido",
        payer: {
          email: "cliente@email.com",
          first_name: payer?.name || "Cliente",
          last_name: "Sushi",
          identification: {
            type: "CPF",
            number: "06271410138",
          },
        },
      },
    });

    const pix = result.point_of_interaction?.transaction_data;
    if (!pix) {
      return NextResponse.json({ error: "PIX não retornou" }, { status: 500 });
    }

    return NextResponse.json({
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
      payment_id: result.id,
      status: result.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno PIX", detail: err instanceof Error ? err.message : err },
      { status: 500 }
    );
  }
}
