import { NextResponse } from "next/server";
import { isValidCustomerPhone } from "../../../../lib/customerPhone";
import {
  LOYALTY_DISCOUNT_VALUE,
  LOYALTY_ORDER_INTERVAL,
  getLoyaltyStatusForPhone,
} from "../../../../lib/loyalty";

export async function POST(request: Request) {
  try {
    const { phone } = (await request.json()) as { phone?: string };

    if (!phone || !isValidCustomerPhone(phone)) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    const status = await getLoyaltyStatusForPhone(phone);

    return NextResponse.json({
      ...status,
      interval: LOYALTY_ORDER_INTERVAL,
      rewardValue: LOYALTY_DISCOUNT_VALUE,
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar fidelidade." }, { status: 500 });
  }
}
