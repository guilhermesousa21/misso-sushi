import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { orderId, amount, title, payer } = await req.json();
    const value = Number(amount);
    const parsedOrderId = Number(orderId);

    if (!parsedOrderId || !value || value <= 0) {
      return NextResponse.json({ error: "Pedido ou valor inválido." }, { status: 400 });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Token não configurado." }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const client = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: String(parsedOrderId),
            title: title || `Missô Sushi #${parsedOrderId}`,
            quantity: 1,
            unit_price: value,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: payer?.name || "Cliente",
          email: payer?.email || "cliente@email.com",
        },
        external_reference: String(parsedOrderId),
        notification_url: `${origin}/api/mercadopago/webhook`,
        back_urls: {
          success: `${origin}/pedido/${parsedOrderId}?payment=success`,
          failure: `${origin}/checkout?payment=failure&order=${parsedOrderId}`,
          pending: `${origin}/pedido/${parsedOrderId}?payment=pending`,
        },
        auto_return: "approved",
      },
    });

    const initPoint = result.init_point || result.sandbox_init_point;
    if (!initPoint) {
      return NextResponse.json({ error: "Checkout não retornou URL." }, { status: 500 });
    }

    return NextResponse.json({
      init_point: initPoint,
      preference_id: result.id,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erro ao iniciar pagamento com cartão.",
        detail: err instanceof Error ? err.message : err,
      },
      { status: 500 }
    );
  }
}
