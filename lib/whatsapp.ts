import { stages } from "@/lib/data";
import { normalizeNigerianPhone } from "@/lib/phone";

function stageLabel(code: string): string {
  return stages.find((s) => s.code === code)?.name ?? code;
}

function formatNaira(amountKobo: number): string {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}

type UnpaidChild = {
  name: string;
  stage: string;
};

function childListText(unpaidChildren: UnpaidChild[], feesByStage: Record<string, number>): string {
  return unpaidChildren
    .map((c) => {
      const amountKobo = feesByStage[c.stage];
      const amount = typeof amountKobo === "number" ? formatNaira(amountKobo) : "contact the school for the fee amount";
      return `${c.name} (${stageLabel(c.stage)}): ${amount}`;
    })
    .join("; ");
}

// Sends a WhatsApp fee-reminder via Meta's WhatsApp Cloud API. Requires a
// verified WhatsApp Business Account and an approved message template — see
// .env.example. Business-initiated messages like this can't be sent as
// freeform text, only as a pre-approved template referenced by name.
export async function sendWhatsAppFeeReminder(
  parent: { guardianName: string; phone: string },
  unpaidChildren: UnpaidChild[],
  term: string,
  feesByStage: Record<string, number>
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";

  if (!phoneNumberId || !accessToken || !templateName) return false;

  const to = normalizeNigerianPhone(parent.phone);
  if (!to) return false;

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: parent.guardianName },
              { type: "text", text: childListText(unpaidChildren, feesByStage) },
              { type: "text", text: term },
            ],
          },
        ],
      },
    }),
  });

  return res.ok;
}
