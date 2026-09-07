// Shared across email/SMS/WhatsApp notifications and every admin/portal view
// that shows a Naira amount, so the format stays identical everywhere.
export function formatNaira(amountKobo: number): string {
  return `₦${(amountKobo / 100).toLocaleString("en-NG")}`;
}
