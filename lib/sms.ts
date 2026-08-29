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

// Sends a fee-reminder SMS via Termii. No template pre-approval needed —
// unlike WhatsApp, this is freeform text. See .env.example for setup.
export async function sendSmsFeeReminder(
  parent: { guardianName: string; phone: string },
  unpaidChildren: UnpaidChild[],
  term: string,
  feesByStage: Record<string, number>
): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID;

  if (!apiKey || !senderId) return false;

  const to = normalizeNigerianPhone(parent.phone);
  if (!to) return false;

  const message = `Hi ${parent.guardianName}, ${term} fees are still outstanding for: ${childListText(
    unpaidChildren,
    feesByStage
  )}. Pay via the Earlydays parent portal.`;

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  return res.ok;
}
