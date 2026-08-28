// Parents' phone numbers are free-typed (see AdminParentsList.tsx), so this
// normalizes the common Nigerian formats into E.164 (+234...) for WhatsApp/SMS
// providers, which both require a consistent international format.
export function normalizeNigerianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");

  if (/^\+234\d{10}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^234\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`;
  }
  return null;
}
