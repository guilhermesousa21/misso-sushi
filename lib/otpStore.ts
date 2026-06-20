import { getSupabaseAdmin } from "./supabaseAdmin";
import { normalizeCustomerPhone } from "./customerPhone";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const memoryStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 10 * 60 * 1000;

export const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

export async function saveOtpChallenge(phone: string, code: string) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const expiresAt = Date.now() + OTP_TTL_MS;
  memoryStore.set(normalizedPhone, { code, expiresAt });

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("customer_otp_challenges").upsert(
      {
        phone: normalizedPhone,
        code,
        expires_at: new Date(expiresAt).toISOString(),
      },
      { onConflict: "phone" }
    );
  } catch {
    // Memory fallback is enough for local/dev environments.
  }
}

export async function verifyOtpChallenge(phone: string, code: string) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const memoryEntry = memoryStore.get(normalizedPhone);

  if (memoryEntry && memoryEntry.code === code && memoryEntry.expiresAt > Date.now()) {
    memoryStore.delete(normalizedPhone);
    return true;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("customer_otp_challenges")
      .select("code,expires_at")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (!data?.code || data.code !== code) return false;
    if (new Date(data.expires_at).getTime() < Date.now()) return false;

    await supabase.from("customer_otp_challenges").delete().eq("phone", normalizedPhone);
    memoryStore.delete(normalizedPhone);
    return true;
  } catch {
    return false;
  }
}
