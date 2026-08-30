import { randomUUID } from "crypto";

export function generateReferenceCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}
