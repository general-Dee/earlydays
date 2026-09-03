import type { ValidationResult } from "@/lib/validation";
import { ADMIN_AREAS, type AdminArea } from "@/lib/firebase/types";

export const MAX_NAME_LENGTH = 200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_AREAS: readonly AdminArea[] = ADMIN_AREAS;

export function validateDisplayName(value: string | undefined): ValidationResult<string> {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: false, error: "Name is required" };
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, error: "Name is too long" };
  return { ok: true, value: trimmed };
}

export function validateEmail(value: string | undefined): ValidationResult<string> {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: false, error: "Email is required" };
  if (!EMAIL_PATTERN.test(trimmed) || trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "Enter a valid email address" };
  }
  return { ok: true, value: trimmed };
}

export function validateAreas(value: unknown, isSuperAdmin: boolean): ValidationResult<AdminArea[]> {
  if (isSuperAdmin) return { ok: true, value: [] };

  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "Grant at least one area, or make this admin a superadmin" };
  }

  const areas: AdminArea[] = [];
  for (const area of value) {
    if (typeof area !== "string" || !VALID_AREAS.includes(area as AdminArea)) {
      return { ok: false, error: `Unknown area "${String(area)}"` };
    }
    areas.push(area as AdminArea);
  }

  return { ok: true, value: areas };
}
