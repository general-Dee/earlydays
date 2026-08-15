import { randomUUID } from "crypto";
import { FEE_BY_STAGE } from "@/lib/fees";
import type { ChildRecord } from "@/lib/firebase/types";

export const MAX_NAME_LENGTH = 200;
export const MAX_PHONE_LENGTH = 50;
export const MAX_ADMISSION_NO_LENGTH = 100;
export const MAX_CHILDREN = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateGuardianName(value: string | undefined): ValidationResult<string> {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: false, error: "Guardian name is required" };
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, error: "Guardian name is too long" };
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

export function validatePhone(value: string | undefined): ValidationResult<string | undefined> {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > MAX_PHONE_LENGTH) return { ok: false, error: "Phone number is too long" };
  return { ok: true, value: trimmed || undefined };
}

type ChildInput = { id?: string; name?: string; stage?: string; admissionNo?: string };

export function validateChildren(value: unknown): ValidationResult<ChildRecord[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "Add at least one child" };
  }
  if (value.length > MAX_CHILDREN) {
    return { ok: false, error: "Too many children on one account" };
  }

  const prepared: ChildRecord[] = [];
  for (const child of value as ChildInput[]) {
    const trimmedName = child.name?.trim() ?? "";
    const stage = child.stage?.trim() ?? "";
    const trimmedAdmissionNo = child.admissionNo?.trim() ?? "";

    if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
      return { ok: false, error: "Each child needs a valid name" };
    }
    if (!Object.prototype.hasOwnProperty.call(FEE_BY_STAGE, stage)) {
      return { ok: false, error: `Unknown stage "${stage}"` };
    }
    if (trimmedAdmissionNo.length > MAX_ADMISSION_NO_LENGTH) {
      return { ok: false, error: "Admission number is too long" };
    }

    prepared.push({
      id: typeof child.id === "string" && child.id ? child.id : randomUUID(),
      name: trimmedName,
      stage,
      ...(trimmedAdmissionNo ? { admissionNo: trimmedAdmissionNo } : {}),
    });
  }

  return { ok: true, value: prepared };
}
