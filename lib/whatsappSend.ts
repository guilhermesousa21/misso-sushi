export const normalizeWhatsAppPhone = (value?: string | null) => {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export async function sendWhatsAppText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

  if (!token || !phoneNumberId) {
    return {
      ok: false as const,
      configured: false,
      error: "Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const customerPhone = normalizeWhatsAppPhone(to);
  if (!customerPhone) {
    return {
      ok: false as const,
      configured: true,
      error: "Telefone inválido.",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customerPhone,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false as const,
      configured: true,
      error: data?.error?.message || "Erro ao enviar WhatsApp.",
    };
  }

  return { ok: true as const, configured: true, data };
}
