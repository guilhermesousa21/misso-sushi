import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerSessionCookieName } from "../../../../lib/customerSession";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(customerSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
